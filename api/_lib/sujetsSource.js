import { createHash } from "node:crypto";
import { HttpError, groqChatJSON } from "./groq.js";
import { tidy } from "./sujets/html.js";
import * as reussir from "./sujets/reussir.js";
import * as formation from "./sujets/formation.js";
import { findDuplicates } from "./sujets/dedupe.js";

// Monthly subjects importer — the engine behind the admin "Générer" button.
//
// Two sites publish the TCF Canada subjects candidates report each month, and
// each has a fixed index page per épreuve (four links in all). Their adapters
// live in api/_lib/sujets/ and both answer the same three questions: which
// months exist, where a month lives, and what it contains — one parses prose
// out of WordPress markup, the other reads a Next.js flight payload. Everything
// downstream is source-agnostic.
//
// An import takes the newest month either site has published, collects that
// month from both, drops what we already hold, rewords the rest and hands it
// back for review. Nothing is ever written here.
//
// Three kinds of duplicate have to be caught, and they need different tools:
//
//   same source, re-run    A fingerprint of the source text, saved with each
//                          imported subject (see `sourceKey`). Exact, cheap,
//                          and survives the rewording we apply on the way in.
//
//   across the two sites   The same real exam, transcribed by two different
//                          candidates — the wording differs completely, so
//                          fingerprints and text similarity are both useless
//                          (measured: sujets/dedupe.js). The model judges it.
//
//   within one run         Both of the above, applied as the run goes: each
//                          source is checked against what the earlier ones
//                          already contributed.
//
// The rewording is the point of the import, not a nicety: the text belongs to
// someone else, and several themes a month already exist in earlier months of
// our own archive, where near-duplicate paragraphs hurt us in search.
//
// No auth or database access here on purpose: this module is pure enough to
// unit-test (tests/sujets-source.test.mjs). The handler that gates it on an
// admin session lives in api/_lib/admin/sujets.js.

// Order matters only for tie-breaking: when both sites carry the same subject,
// the first one listed is the wording that gets imported and reworded.
export const SOURCES = [reussir, formation];

export { MONTH_LABELS } from "./sujets/html.js";

export const countSubjects = (section, data) =>
  section === "ee"
    ? (data || []).length
    : (data || []).reduce((a, t) => a + (t.parties || []).reduce((b, p) => b + (p.sujets || []).length, 0), 0);

/* ------------------------------- provenance -------------------------------- */

// The button gets pressed several times a month, because the source publishes
// combinaisons as they are reported. A second run must add only what is new —
// but by then the first run's subjects have been REWORDED, so nothing can be
// recognised by comparing text. (Measured: two independent rewrites of the same
// énoncé score no higher against each other than two unrelated énoncés do.)
//
// So each imported subject carries a fingerprint of the SOURCE text it came
// from, and a re-run skips any source item whose fingerprint is already in the
// month. Fingerprints ride along in the saved payload — `src` on an EE
// combinaison, `src` on an EO partie holding the keys imported into it — where
// every renderer ignores them. The EO set is deliberately not index-aligned
// with `sujets`, so adding or deleting a sujet by hand in the admin cannot
// corrupt it.
//
// Normalising before hashing means casing, accents and punctuation on the
// source page can drift without inventing a duplicate; rewriting the sentence
// still counts as a new subject, which is the honest reading.
const SRC_KEY_LENGTH = 12;
export const sourceKey = (text) =>
  createHash("sha1")
    .update(
      String(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim(),
    )
    .digest("hex")
    .slice(0, SRC_KEY_LENGTH);


// Every source fingerprint already recorded in a saved month.
export function provenanceKeys(section, data) {
  const keys = new Set();
  if (section === "ee") for (const s of data || []) { if (s?.src) keys.add(s.src); }
  else for (const t of data || []) for (const p of t?.parties || []) for (const k of p?.src || []) keys.add(k);
  return keys;
}

/* ------------------------------- reformulation ----------------------------- */

const SYSTEM = `Tu reformules des sujets d'examen TCF Canada rédigés en français.

Règles impératives :
- Réécris chaque texte AVEC D'AUTRES MOTS : change la construction des phrases, l'ordre des informations, les verbes et les connecteurs. Aucune phrase ne doit rester identique à l'originale, et un simple échange de synonymes ne suffit pas.
- Garde EXACTEMENT la même idée : même situation, même rôle de chaque personne (ami(e), collègue, voisin(e), employé(e)…), même consigne, mêmes éléments entre parenthèses et dans le même ordre, même position et mêmes arguments pour les documents d'opinion.
- Le candidat est VOUVOYÉ : garde « votre / vous / vos » et l'impératif de politesse (« Rédigez », « Écrivez », « Racontez »). Ne passe jamais au tutoiement.
- N'INVERSE JAMAIS QUI PARLE. Quand l'original commence par « Je suis… » ou « Je travaille… », c'est l'examinateur qui se présente : garde cette première personne. Ce que fait le candidat reste à la deuxième personne. « Je travaille à l'accueil d'une billetterie. Vous êtes en vacances et vous me posez des questions » peut devenir « Je suis employé(e) à la billetterie d'un théâtre. En vacances, vous m'interrogez… », jamais « Vous occupez le poste d'accueil… ».
- Garde la forme de la phrase : une question reste une question (« Comment évaluez-vous… ? » ne devient pas « Évaluez… »), une consigne reste une consigne.
- Un item portant "type":"titre" est le TITRE du thème de débat, pas une consigne : rends un titre (groupe nominal ou question), sans verbe à l'impératif et sans t'adresser au candidat. Par exemple « Distributeurs dans les lycées : avantages et inconvénients » peut devenir « Les distributeurs automatiques au lycée : bienfaits et limites », jamais « Analysez les distributeurs… ».
- N'ajoute aucune information et n'en supprime aucune.
- Reste en français ; garde le registre, les noms propres, les lieux et les chiffres.
- Corrige au passage les fautes de grammaire ou d'accord de l'original.
- Longueur proche de l'original.
- Tu ne réponds jamais au sujet et tu ne le commentes pas : tu le reformules, c'est tout.

Réponds uniquement par un objet JSON de la forme {"items":[{"id":<id>,"text":"<reformulation>"}]}, avec exactement les mêmes id que la demande.`;

// Retry passes, for the énoncés an earlier pass left too close to the source.
// Each item carries the attempt that was rejected ("refuse"), which is what
// actually moves the model off the original wording.
const INSIST = `

ATTENTION : ces textes t'ont déjà été soumis et ta reformulation a été REJETÉE car trop proche de l'original. Quand un item porte un champ "refuse", c'est ta tentative rejetée.
Produis une formulation nettement différente de "text" ET de "refuse" : change l'ordre des informations, la voix et la construction des phrases, le vocabulaire. L'idée, les rôles, les éléments entre parenthèses et le vouvoiement restent strictement identiques.`;

// Groq's on-demand tier meters tokens per minute, and it counts the reserved
// `max_tokens` of a request, not just what comes back. A month is therefore
// sent as few, fat batches — every extra batch repeats the system prompt
// against that budget — one at a time, backing off when Groq says to.
const MAX_BATCH_ITEMS = 10;
const MAX_BATCH_CHARS = 3000;
// Retry passes go out in small batches: given eight énoncés at once the model
// coasts and hands a few back untouched, and by then only a handful are left.
const INSIST_BATCH_ITEMS = 3;
const PASSES = 3;
const MAX_ATTEMPTS = 3;
const BACKOFF_CAP_MS = 25000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The strings of a month, each with a setter that writes the rewrite back into
// the parsed tree.
function slotsFor(section, data) {
  const slots = [];
  if (section === "ee") {
    for (const s of data) {
      for (const k of ["t1", "t2"]) if (s[k]) slots.push({ text: s[k], apply: (v) => { s[k] = v; } });
      // The tâche 3 theme is a heading, not an instruction — flagged so the
      // model rewrites it as a title instead of turning it into a task.
      if (s.t3?.theme) slots.push({ text: s.t3.theme, title: true, apply: (v) => { s.t3.theme = v; } });
      for (const k of ["doc1", "doc2"]) if (s.t3?.[k]) slots.push({ text: s.t3[k], apply: (v) => { s.t3[k] = v; } });
    }
  } else {
    for (const t of data) for (const p of t.parties) p.sujets.forEach((text, i) => slots.push({ text, apply: (v) => { p.sujets[i] = v; } }));
  }
  return slots;
}

function batch(entries, maxItems = MAX_BATCH_ITEMS) {
  const batches = [];
  let cur = [];
  let chars = 0;
  for (const entry of entries) {
    if (cur.length && (cur.length >= maxItems || chars + entry.slot.text.length > MAX_BATCH_CHARS)) {
      batches.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(entry);
    chars += entry.slot.text.length;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

/* --- how close a rewrite still is to its source ---------------------------- */

const wordsOf = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9']+/g) || [];

// Share of the source's 4-word sequences that survive verbatim in the rewrite.
// Measured on the real output: an untouched copy scores 1.0, a lazy pass that
// only swaps a few synonyms ~0.76, a genuine rewording 0.02–0.17. Short strings
// (themes) have no 4-grams, so they only have to differ at all.
const NGRAM = 4;
function sourceOverlap(original, rewrite) {
  const a = wordsOf(original);
  const b = wordsOf(rewrite);
  if (a.length < NGRAM) return a.join(" ") === b.join(" ") ? 1 : 0;
  const grams = (w) => new Set(Array.from({ length: w.length - NGRAM + 1 }, (_, i) => w.slice(i, i + NGRAM).join(" ")));
  const ga = grams(a);
  const gb = grams(b);
  let hits = 0;
  for (const g of ga) if (gb.has(g)) hits++;
  return hits / ga.size;
}
// Body text has room to be rebuilt; a theme title is a handful of words naming
// a debate, where there are only so many ways to say the same thing, so it is
// held to a looser bar.
const MAX_OVERLAP = 0.5;
const MAX_OVERLAP_TITLE = 0.7;

// The model likes typographic exotica the rest of the archive doesn't use —
// non-breaking hyphens in "Êtes‑vous", narrow spaces before punctuation. Left
// alone they'd render inconsistently next to hand-typed months and break
// searching in the admin manager.
const normalizeRewrite = (s) =>
  tidy(
    String(s)
      .replace(/[‐‑]/g, "-") // hyphen, non-breaking hyphen
      .replace(/[\u00a0\u2009\u202f]/g, " "), // no-break, thin, narrow no-break spaces
  );

// A rewrite is accepted only if it is plausibly the same énoncé (not a summary,
// an answer or padding) AND actually reworded. Rewriting is the whole point of
// the import, so "close enough to the original" counts as a failure.
const accepted = (slot, rewrite) =>
  typeof rewrite === "string" &&
  rewrite.trim().length >= 12 &&
  rewrite.length >= slot.text.length * 0.5 &&
  rewrite.length <= slot.text.length * 2.2 &&
  sourceOverlap(slot.text, rewrite.trim()) <= (slot.title ? MAX_OVERLAP_TITLE : MAX_OVERLAP);

// Rewords every string of `data` IN PLACE. Whatever is still too close to the
// source after a second, more insistent pass is left with the source wording
// and returned in `kept` so the review step can flag it.
export async function reformulate(section, data, { deadline = Infinity } = {}) {
  const slots = slotsFor(section, data);
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let pending = slots.map((slot, id) => ({ id, slot }));

  for (let pass = 0; pass < PASSES && pending.length && Date.now() < deadline; pass++) {
    const insist = pass > 0;
    const retry = [];
    // Sequential on purpose — see the batching note above.
    for (const items of batch(pending, insist ? INSIST_BATCH_ITEMS : MAX_BATCH_ITEMS)) {
      // Out of time: whatever is left keeps the source wording and is flagged,
      // rather than the serverless function being killed mid-import.
      if (Date.now() >= deadline) {
        retry.push(...items);
        continue;
      }
      const res = await rewriteBatch(items, insist, deadline);
      for (const k of Object.keys(usage)) usage[k] += res?.usage?.[k] || 0;
      const byId = new Map((Array.isArray(res?.json?.items) ? res.json.items : []).map((r) => [Number(r?.id), r?.text]));
      for (const entry of items) {
        const raw = byId.get(entry.id);
        const rewrite = typeof raw === "string" ? normalizeRewrite(raw) : null;
        if (accepted(entry.slot, rewrite)) entry.slot.apply(rewrite);
        else {
          if (rewrite) entry.rejected = rewrite;
          retry.push(entry);
        }
      }
    }
    pending = retry;
  }

  return { kept: pending.map((e) => e.slot.text), usage, total: slots.length };
}

// One batch, retried while Groq is rate-limiting us. Any other failure gives up
// immediately: the batch keeps its source wording and the import continues, so
// a bad minute costs a few flagged énoncés rather than the whole month.
async function rewriteBatch(items, insist = false, deadline = Infinity) {
  const payload = {
    items: items.map(({ id, slot, rejected }) => ({
      id,
      text: slot.text,
      ...(slot.title ? { type: "titre" } : {}),
      ...(insist && rejected ? { refuse: rejected } : {}),
    })),
  };
  const chars = items.reduce((a, i) => a + i.slot.text.length, 0);
  // A rewrite runs about as long as its source — roughly one token per three
  // characters of French — plus a little for the JSON envelope. Reserving less
  // truncates the answer; reserving more just burns the per-minute budget,
  // because Groq meters what a request RESERVES, not what it returns.
  const maxTokens = Math.min(2500, Math.ceil(chars / 2.5) + 25 * items.length + 150);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await groqChatJSON(
        [
          { role: "system", content: insist ? SYSTEM + INSIST : SYSTEM },
          { role: "user", content: JSON.stringify(payload) },
        ],
        { maxTokens, temperature: insist ? 0.9 : 0.6 },
      );
    } catch (err) {
      if (err?.upstreamStatus !== 429 || attempt === MAX_ATTEMPTS) return null;
      const wait = Math.min(err.retryAfterMs || 5000, BACKOFF_CAP_MS) + 500;
      if (Date.now() + wait >= deadline) return null; // no time to wait it out
      await sleep(wait);
    }
  }
  return null;
}

// Adds newly imported subjects to a month that already has some, leaving every
// existing entry (imported earlier, or typed by hand) untouched.
export function mergeMonth(section, existing, fresh) {
  if (section === "ee") {
    // The source lists its newest combinaison first and our archive follows
    // that order, so new ones go on top; `n` is then just the position.
    return [...fresh, ...(existing || [])].map((s, i) => ({ ...s, n: i + 1 }));
  }
  const out = (existing || []).map((t) => ({ ...t, parties: (t.parties || []).map((p) => ({ ...p, sujets: [...(p.sujets || [])], src: [...(p.src || [])] })) }));
  for (const t of fresh) {
    let tt = out.find((x) => x.tache === t.tache);
    if (!tt) { tt = { tache: t.tache, parties: [] }; out.push(tt); }
    for (const p of t.parties) {
      let pp = tt.parties.find((x) => x.partie === p.partie);
      if (!pp) { pp = { partie: p.partie, sujets: [], src: [] }; tt.parties.push(pp); }
      pp.sujets.push(...p.sujets);
      pp.src = [...new Set([...(pp.src || []), ...p.src])];
    }
    tt.parties.sort((a, b) => a.partie - b.partie);
  }
  return out.sort((a, b) => a.tache - b.tache);
}

/* ------------------------------ the import run ----------------------------- */

const monthKeyOf = (t) => `${t.year}-${String(t.monthNum).padStart(2, "0")}`;

// Flattens a month into one comparable item per subject, so the duplicate
// checks have something to compare and the survivors can be put back.
// `key` is the fingerprint of the SOURCE wording — taken here, before any
// rewording, because that is the only text a later run can match against.
export function itemsOf(section, data) {
  const items = [];
  if (section === "ee") {
    for (const s of data || []) {
      items.push({
        text: [s.t1, s.t2, s.t3?.theme].filter(Boolean).join(" — "),
        key: s.src || sourceKey([s.t1, s.t2, s.t3?.theme, s.t3?.doc1, s.t3?.doc2].filter(Boolean).join(" ")),
        sujet: s,
      });
    }
  } else {
    for (const t of data || []) {
      for (const p of t.parties || []) {
        for (const s of p.sujets || []) items.push({ text: s, key: sourceKey(s), tache: t.tache, partie: p.partie, sujet: s });
      }
    }
  }
  return items;
}

// Rebuilds a section-shaped tree from items, carrying their fingerprints into
// the `src` fields the next run will read.
export function treeOf(section, items) {
  if (section === "ee") return items.map((it, i) => ({ ...it.sujet, n: i + 1, src: it.key }));
  const taches = new Map();
  for (const it of items) {
    if (!taches.has(it.tache)) taches.set(it.tache, new Map());
    const parties = taches.get(it.tache);
    if (!parties.has(it.partie)) parties.set(it.partie, { sujets: [], src: [] });
    const bucket = parties.get(it.partie);
    bucket.sujets.push(it.sujet);
    bucket.src.push(it.key);
  }
  return [...taches.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tache, parties]) => ({
      tache,
      parties: [...parties.entries()].sort((a, b) => a[0] - b[0]).map(([partie, b]) => ({ partie, sujets: b.sujets, src: b.src })),
    }));
}

// EO sujets are only ever compared within their tâche: partie numbering is each
// site's own and means nothing across sources, while tâche 2 (interaction) and
// tâche 3 (opinion) are never the same kind of subject.
const bucketOf = (section, item) => (section === "ee" ? "ee" : `t${item.tache}`);

// The newest month any source has published, and which sources carry it. A
// source that is down or has changed shape is skipped rather than failing the
// run — one site's outage should not block the other's subjects.
async function pickMonth(section) {
  const settled = await Promise.all(
    SOURCES.map(async (src) => {
      try { return { src, months: await src.months(section) }; } catch { return { src, months: [] }; }
    }),
  );
  const reachable = settled.filter((s) => s.months.length);
  if (!reachable.length) throw new HttpError(502, "Aucune des sources n'a répondu — réessayez dans un instant.");

  let target = null;
  for (const { months } of reachable) {
    const newest = months[0];
    if (!target || newest.year > target.year || (newest.year === target.year && newest.monthNum > target.monthNum)) target = newest;
  }
  const carriers = reachable
    .map(({ src, months }) => ({ src, month: months.find((m) => m.year === target.year && m.monthNum === target.monthNum) }))
    .filter((c) => c.month);
  return { target, carriers, unreachable: SOURCES.length - reachable.length };
}

// `known` is `[{ key: "2026-08", data }]` — the months the caller already
// holds. It cannot know in advance which month the sources have published last,
// so it sends its most recent few and we use whichever matches. This is what
// lets a re-run add only what is new. Three outcomes, reported as `mode`:
//   "new"     — we don't have this month at all; import everything.
//   "merge"   — we have it WITH fingerprints; import the unseen subjects and
//               append them, leaving everything already there untouched.
//   "replace" — we have it but with no fingerprints (typed by hand, or saved
//               before this existed). Nothing can be matched, so the whole
//               month is re-imported and the caller is told it replaces.
//
// Both duplicate checks run BEFORE the rewording, so a re-run that finds one
// new combinaison spends one small AI call rather than redoing the month.
//
// `budgetMs` is a wall-clock ceiling, well under the function's maxDuration
// (vercel.json). Groq's on-demand tier meters 8000 tokens a minute, so a large
// first import spends part of its time waiting on rate limits; when that eats
// the budget the rewording stops and the leftovers come back flagged in `kept`
// rather than the request being killed with nothing to show.
export async function importLatest(section, { known = [], budgetMs = 45000 } = {}) {
  const startedAt = Date.now();
  const deadline = startedAt + budgetMs;
  const { target, carriers, unreachable } = await pickMonth(section);

  const held = (known || []).find((m) => m?.key === monthKeyOf(target))?.data;
  const existing = countSubjects(section, held) ? held : null;
  const seen = existing ? provenanceKeys(section, existing) : new Set();
  const mode = !existing ? "new" : seen.size ? "merge" : "replace";
  // In "replace" the month is rebuilt from scratch, so nothing counts as known.
  const fingerprints = mode === "merge" ? new Set(seen) : new Set();

  // What the semantic check compares against: the subjects we are keeping, plus
  // whatever earlier sources in this same run have already contributed.
  const knownItems = mode === "merge" ? itemsOf(section, existing).map((it, i) => ({ ...it, id: i })) : [];
  const accepted = [];
  const sources = [];

  for (const { src, month } of carriers) {
    let parsed;
    try {
      parsed = await src.fetchMonth(section, month);
    } catch {
      sources.push({ id: src.id, label: src.label, url: month.url, found: 0, added: 0, failed: true });
      continue;
    }
    const items = itemsOf(section, parsed);
    // Cheap pass first: source text we have imported before, verbatim.
    const unseen = items.filter((it) => !fingerprints.has(it.key));

    // Then the semantic pass, per bucket — the two sites word the same exam
    // differently, so only meaning can match them.
    const fresh = [];
    for (const bucket of [...new Set(unseen.map((it) => bucketOf(section, it)))]) {
      if (Date.now() >= deadline) break;
      const candidates = unseen.filter((it) => bucketOf(section, it) === bucket).map((it, i) => ({ ...it, id: 1000 + i }));
      const against = [...knownItems, ...accepted].filter((it) => bucketOf(section, it) === bucket);
      const dupes = await findDuplicates(candidates, against, { deadline });
      for (const c of candidates) if (!dupes.has(c.id)) fresh.push(c);
    }

    for (const it of fresh) {
      fingerprints.add(it.key);
      accepted.push({ ...it, id: knownItems.length + accepted.length });
    }
    sources.push({ id: src.id, label: src.label, url: month.url, found: countSubjects(section, parsed), added: fresh.length });
  }

  const found = sources.reduce((a, s) => a + s.found, 0);
  if (!found) throw new HttpError(502, `Aucun sujet trouvé pour ${target.month} ${target.year} — la structure des pages sources a probablement changé.`);

  // Fingerprints are already on the tree, and rewording only touches the text,
  // so what gets saved still points back at the source wording it came from.
  const fresh = treeOf(section, accepted);
  const added = countSubjects(section, fresh);
  const { kept, usage, total } = added ? await reformulate(section, fresh, { deadline }) : { kept: [], usage: null, total: 0 };
  const data = mode === "merge" ? mergeMonth(section, existing, fresh) : fresh;

  return {
    section,
    year: target.year,
    monthNum: target.monthNum,
    month: target.month,
    sources,
    unreachable,
    mode,
    data, // the complete month to save
    fresh, // just the additions, for the review panel
    counts: {
      found,
      added,
      skipped: found - added,
      existing: countSubjects(section, existing),
      strings: total,
      kept: kept.length,
    },
    kept: kept.map((t) => t.slice(0, 160)),
    usage,
    durationMs: Date.now() - startedAt,
  };
}
