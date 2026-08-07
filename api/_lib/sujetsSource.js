import { HttpError, groqChatJSON } from "./groq.js";

// Monthly subjects importer — the source side of the admin "Générer" button.
//
// reussir-tcfcanada.com publishes the freshly reported TCF Canada subjects
// every month. Two index pages never change address:
//   /expression-ecrite/   and   /expression-orale/
// each listing one link per month (…/aout-2026-expression-ecrite/ …). So the
// importer reads the index, follows the newest month, parses that page, and
// rewords every string through Groq before anything is shown for publishing.
//
// The rewording is the point, not a nicety: the source text is someone else's
// wording, three or four themes a month already exist in earlier months of our
// own archive, and near-duplicate paragraphs across archive pages hurt them in
// search. Every string goes through the model; anything the model fails to
// rewrite convincingly is handed back flagged (see `kept`) rather than silently
// published verbatim.
//
// No auth or database access here on purpose: this module is pure enough to
// unit-test (tests/sujets-source.test.mjs). The handler that gates it on an
// admin session lives in api/_lib/admin/sujets.js.

const ORIGIN = "https://reussir-tcfcanada.com";
const INDEX_PATH = { ee: "/expression-ecrite/", eo: "/expression-orale/" };
const SECTION_SLUG = { ee: "expression-ecrite", eo: "expression-orale" };

// Slugs as they appear in the source URLs (unaccented, lowercase).
const MONTH_SLUGS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
export const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const FETCH_TIMEOUT_MS = 15000;
// A plain browser UA: the site sits behind a CDN that answers 403 to obvious
// scripted agents, and this reads one public page a month.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/* ------------------------------- html → lines ------------------------------ */

const NAMED_ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", times: "×",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  hellip: "…", ndash: "–", mdash: "—", laquo: "«", raquo: "»", eacute: "é",
  egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", ocirc: "ô", ucirc: "û", icirc: "î",
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

const BLOCK_TAGS = "p|div|section|article|header|footer|nav|aside|main|h[1-6]|ul|ol|li|table|tr|td|th|blockquote|figure|figcaption|br|hr";

// Flattens a page to the visible lines, in reading order. Block elements are
// line breaks; inline elements vanish WITHOUT leaving a space, because the
// source styles words mid-sentence ("J'ai mis cer<span …>tains objets") and a
// space there would split the word. `<article>` is preferred when present — it
// excludes the header, sidebar and footer chrome.
export function toLines(html) {
  let h = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const article = h.match(/<article[\s\S]*?<\/article>/i);
  if (article) h = article[0];
  return decodeEntities(
    h
      .replace(new RegExp(`<\\/?(?:${BLOCK_TAGS})(?:\\s[^>]*)?\\/?>`, "gi"), "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((l) => tidy(l))
    .filter(Boolean);
}

// French typography keeps a space before ? ! : ; and inside quotes, so only the
// period and comma are tightened — the source often trails "(…, etc.) .".
const tidy = (s) => s.replace(/\s+/g, " ").replace(/\s+([.,])/g, "$1").trim();

/* --------------------------------- markers -------------------------------- */

const RE = {
  combinaison: /^combinaison\s*(\d+)/i,
  tache: /^t[âa]che\s*(\d+)/i,
  document: /^document\s*(\d+)\s*:?/i,
  partie: /^partie\s*(\d+)/i,
  sujet: /^sujet\s*(\d+)\s*:?/i,
  // "(60 mots minimum/120 mots maximum)" — a constraint, not subject text.
  wordCount: /^\(?\s*\d+\s*mots\b/i,
  // Page furniture that surrounds the subjects; also the tail after the last
  // one, which would otherwise be swallowed into the final document.
  chrome: /^(r[ée]ussir l|pour partager|sujets? d.actualit|attention\s*!?$|consignes?$|formations?$|exemples? corrig|corrections?$|×$|partagez|commentaires?$|laisser un commentaire)/i,
};

const isMarker = (l) =>
  RE.combinaison.test(l) || RE.tache.test(l) || RE.document.test(l) || RE.partie.test(l) || RE.sujet.test(l) || RE.wordCount.test(l) || RE.chrome.test(l);

// Text that follows a marker on the same line ("Sujet 1 : Je suis…").
const inlineRest = (line, match) => line.slice(match[0].length).replace(/^[\s:.–—-]+/, "").trim();

// Everything from `i` up to the next marker, joined — a subject or a document
// can be split across several paragraphs.
function collect(lines, i) {
  const buf = [];
  while (i < lines.length && !isMarker(lines[i])) buf.push(lines[i++]);
  return [buf.join(" ").trim(), i];
}

const joinText = (inline, rest) => tidy([inline, rest].filter(Boolean).join(" "));

/* --------------------------------- parsers -------------------------------- */

// Expression écrite: "Combinaison N" → Tâche 1 / Tâche 2 / Tâche 3 (theme,
// then Document 1 and Document 2). Combinaisons are numbered `n` in page
// order — the source lists the newest first, which is the order our archive
// shows them in.
export function parseEE(lines) {
  const out = [];
  let cur = null;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if ((m = line.match(RE.combinaison))) {
      cur = { t1: "", t2: "", t3: { theme: "", doc1: "", doc2: "" } };
      out.push(cur);
      i++;
      continue;
    }
    if (cur && (m = line.match(RE.tache))) {
      const n = Number(m[1]);
      const inline = inlineRest(line, m);
      const [rest, next] = collect(lines, i + 1);
      i = next;
      const text = joinText(inline, rest);
      if (n === 1) cur.t1 = text;
      else if (n === 2) cur.t2 = text;
      else if (n === 3) cur.t3.theme = text;
      continue;
    }
    if (cur && (m = line.match(RE.document))) {
      const n = Number(m[1]);
      const inline = inlineRest(line, m);
      const [rest, next] = collect(lines, i + 1);
      i = next;
      const text = joinText(inline, rest);
      if (n === 1) cur.t3.doc1 = text;
      else if (n === 2) cur.t3.doc2 = text;
      continue;
    }
    i++;
  }
  return out.filter((s) => s.t1 || s.t2).map((s, idx) => ({ n: idx + 1, ...s }));
}

// Expression orale: "Tâche 2"/"Tâche 3" → "Partie N" → "Sujet N". Stored with
// tâches and parties ascending, matching the shipped archive.
export function parseEO(lines) {
  const taches = new Map();
  let tache = null;
  let partie = null;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if ((m = line.match(RE.tache))) {
      const n = Number(m[1]);
      tache = n === 2 || n === 3 ? n : null;
      partie = null;
      i++;
      continue;
    }
    if ((m = line.match(RE.partie))) {
      partie = Number(m[1]);
      i++;
      continue;
    }
    if ((m = line.match(RE.sujet))) {
      const inline = inlineRest(line, m);
      const [rest, next] = collect(lines, i + 1);
      i = next;
      const text = joinText(inline, rest);
      if (tache && partie && text) {
        if (!taches.has(tache)) taches.set(tache, new Map());
        const parties = taches.get(tache);
        if (!parties.has(partie)) parties.set(partie, []);
        parties.get(partie).push(text);
      }
      continue;
    }
    i++;
  }
  return [...taches.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, parties]) => ({
      tache: t,
      parties: [...parties.entries()].sort((a, b) => a[0] - b[0]).map(([p, sujets]) => ({ partie: p, sujets })),
    }));
}

export const countSubjects = (section, data) =>
  section === "ee"
    ? (data || []).length
    : (data || []).reduce((a, t) => a + (t.parties || []).reduce((b, p) => b + (p.sujets || []).length, 0), 0);

/* ------------------------------ source fetching ---------------------------- */

async function fetchPage(url) {
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch {
    throw new HttpError(504, `La source n'a pas répondu (${url}).`);
  }
  if (!res.ok) throw new HttpError(502, `La source a répondu ${res.status} (${url}).`);
  return res.text();
}

// Every month link on an index page, newest first. Reading the month out of the
// slug rather than the link text keeps this independent of the page's wording
// (the source misspells a label now and then — "Decembre 2024").
export function monthLinks(html, section) {
  const slug = SECTION_SLUG[section];
  const re = new RegExp(`href=["']([^"']*?/(${MONTH_SLUGS.join("|")})-(\\d{4})-${slug}/?)["']`, "gi");
  const seen = new Set();
  const out = [];
  for (const m of String(html).matchAll(re)) {
    const url = m[1].startsWith("http") ? m[1] : `${ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const monthNum = MONTH_SLUGS.indexOf(m[2].toLowerCase()) + 1;
    out.push({ url, year: Number(m[3]), monthNum, month: MONTH_LABELS[monthNum - 1] });
  }
  return out.sort((a, b) => b.year - a.year || b.monthNum - a.monthNum);
}

// The most recent month published for a section.
export async function latestMonth(section) {
  const url = `${ORIGIN}${INDEX_PATH[section]}`;
  const links = monthLinks(await fetchPage(url), section);
  if (!links.length) throw new HttpError(502, `Aucun lien mensuel trouvé sur ${url} — la structure de la page a changé.`);
  return links[0];
}

/* ------------------------------- reformulation ----------------------------- */

const SYSTEM = `Tu reformules des sujets d'examen TCF Canada rédigés en français.

Règles impératives :
- Réécris chaque texte AVEC D'AUTRES MOTS : change la construction des phrases, l'ordre des informations, les verbes et les connecteurs. Aucune phrase ne doit rester identique à l'originale, et un simple échange de synonymes ne suffit pas.
- Garde EXACTEMENT la même idée : même situation, même rôle de chaque personne (ami(e), collègue, voisin(e), employé(e)…), même consigne, mêmes éléments entre parenthèses et dans le même ordre, même position et mêmes arguments pour les documents d'opinion.
- Le candidat est VOUVOYÉ : garde « votre / vous / vos » et l'impératif de politesse (« Rédigez », « Écrivez », « Racontez »). Ne passe jamais au tutoiement.
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

// Full import for one section: newest month → parsed → reworded.
//
// `budgetMs` is a wall-clock ceiling for the whole thing, well under the
// function's maxDuration (vercel.json). A month is a few thousand tokens and
// Groq's on-demand tier meters 8000 per minute, so a full import normally
// spends part of its time waiting on rate limits; when that eats the budget,
// the rewording stops and the leftovers come back flagged in `kept` instead of
// the request being killed with nothing to show.
export async function importLatest(section, { budgetMs = 45000 } = {}) {
  const startedAt = Date.now();
  const target = await latestMonth(section);
  const lines = toLines(await fetchPage(target.url));
  const data = section === "ee" ? parseEE(lines) : parseEO(lines);
  const count = countSubjects(section, data);
  if (!count) throw new HttpError(502, `Aucun sujet trouvé sur ${target.url} — la structure de la page a probablement changé.`);

  const { kept, usage, total } = await reformulate(section, data, { deadline: startedAt + budgetMs });
  return {
    section,
    year: target.year,
    monthNum: target.monthNum,
    month: target.month,
    sourceUrl: target.url,
    data,
    counts: { subjects: count, strings: total, kept: kept.length },
    kept: kept.map((t) => t.slice(0, 160)),
    usage,
    durationMs: Date.now() - startedAt,
  };
}
