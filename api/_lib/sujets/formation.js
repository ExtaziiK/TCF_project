import { HttpError } from "../groq.js";
import { fetchPage, tidy, parseMonthLabel } from "./html.js";

// Source adapter: formation-tcfcanada.com
//
// A Next.js app. The subjects are public — a visitor reads them by opening an
// accordion — but they are NOT in the rendered markup: React streams them in
// the flight payload, as `self.__next_f.push([1,"…"])` string chunks that
// concatenate into one long RSC document. Parsing that beats driving a browser,
// which a serverless function cannot do anyway.
//
// Two fixed index pages list the months:
//   /epreuve/expression-ecrite/sujets-actualites
//   /epreuve/expression-orale/sujets-actualites
// and their payload carries { name: "Août 2026", slug: "aot-2026" } per month.
// The slugs are mangled by the site's own accent stripping ("aot-2026",
// "fvrier-2026", one month even holds a whole pasted URL), so the month is read
// from `name` and the slug is used only to build the link.

const ORIGIN = "https://www.formation-tcfcanada.com";
const SECTION_PATH = { ee: "expression-ecrite", eo: "expression-orale" };

export const id = "formation";
export const label = "formation-tcfcanada.com";
export const indexUrl = (section) => `${ORIGIN}/epreuve/${SECTION_PATH[section]}/sujets-actualites`;

/* ------------------------------ flight payload ----------------------------- */

// The RSC stream, reassembled. Each chunk is a JS string literal, so JSON.parse
// unescapes it exactly as the browser would.
export function flightPayload(html) {
  let out = "";
  for (const m of String(html).matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try { out += JSON.parse(m[1]); } catch { /* a non-string chunk; skip */ }
  }
  return out;
}

// The JSON value starting at `from` (an object or array opener), found by
// balancing brackets while respecting strings and escapes. The payload is RSC,
// not JSON, so a value has to be sliced out of it before it can be parsed.
export function valueAt(s, from) {
  const open = s[from];
  const close = open === "[" ? "]" : "}";
  let depth = 0, inStr = false, esc = false;
  for (let i = from; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (!depth) return s.slice(from, i + 1); }
  }
  return null;
}

// Reads the value of `"<key>":` out of a flight payload. Tries every occurrence
// because a key like "parties" can also appear in unrelated framework data.
function readKey(flight, key, accept) {
  for (const m of String(flight).matchAll(new RegExp(`"${key}"\\s*:\\s*(?=[[{])`, "g"))) {
    const start = m.index + m[0].length;
    const raw = valueAt(flight, start);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (!accept || accept(parsed)) return parsed;
    } catch { /* not the one */ }
  }
  return null;
}

/* --------------------------------- months ---------------------------------- */

// The two index pages disagree on how they wrap the month list: écrite nests it
// under a year map ({ "2025": [...], "2026": [...] }), orale ships a flat array,
// and the key above it is generic ("data", "months"). So neither container is
// matched — the month OBJECTS are, wherever they sit: a brace whose own fields
// include both `name` and `slug`.
export function monthEntries(flight) {
  const out = [];
  const seen = new Set();
  for (const m of String(flight).matchAll(/\{(?=[^{}]*"name"\s*:)(?=[^{}]*"slug"\s*:)/g)) {
    const raw = valueAt(flight, m.index);
    if (!raw) continue;
    try {
      const e = JSON.parse(raw);
      if (e?.name && e?.slug && !seen.has(e.slug)) { seen.add(e.slug); out.push(e); }
    } catch { /* not a month entry */ }
  }
  return out;
}

// Every month the index lists, newest first.
export function monthsFrom(flight, section) {
  const rows = [];
  for (const m of monthEntries(flight)) {
    const when = parseMonthLabel(m.name);
    if (when && m.available !== false) rows.push({ ...when, url: `${indexUrl(section)}/${m.slug}` });
  }
  return rows.sort((a, b) => b.year - a.year || b.monthNum - a.monthNum);
}

export async function months(section) {
  return monthsFrom(flightPayload(await fetchPage(indexUrl(section))), section);
}

export async function latestMonth(section) {
  const list = await months(section);
  if (!list.length) throw new HttpError(502, `Aucun mois trouvé sur ${indexUrl(section)} — la structure de la page a changé.`);
  return list[0];
}

/* --------------------------------- parsing --------------------------------- */

const clean = (v) => tidy(typeof v === "string" ? v : "");

// Expression écrite: monthData.combinaisons[] → { titre, tache1:{sujet},
// tache2:{sujet}, tache3:{titre, document1:{contenu}, document2:{contenu}} }.
// `correction` (their worked answer) is deliberately ignored — this imports
// exam subjects, not someone else's model essays.
export function parseEE(flight) {
  const md = readKey(flight, "monthData", (v) => v && Array.isArray(v.combinaisons));
  const out = [];
  for (const c of md?.combinaisons || []) {
    const t1 = clean(c?.tache1?.sujet);
    const t2 = clean(c?.tache2?.sujet);
    if (!t1 && !t2) continue;
    out.push({
      t1,
      t2,
      t3: {
        theme: clean(c?.tache3?.titre),
        doc1: clean(c?.tache3?.document1?.contenu),
        doc2: clean(c?.tache3?.document2?.contenu),
      },
    });
  }
  return out.map((s, i) => ({ n: i + 1, ...s }));
}

// Expression orale: parties[] → { date: "Partie 1", sujets: [{ tache, title }] }.
// Each sujet says which tâche (2 or 3) it belongs to, so the tree is rebuilt
// from that rather than from page order.
export function parseEO(flight) {
  const parties = readKey(flight, "parties", (v) => Array.isArray(v) && v.some((p) => Array.isArray(p?.sujets)));
  const taches = new Map();
  for (const p of parties || []) {
    const partie = Number(String(p?.date || "").match(/(\d+)/)?.[1] ?? p?.jour);
    if (!partie) continue;
    for (const s of p.sujets || []) {
      const tache = Number(s?.tache);
      const text = clean(s?.title || s?.titre);
      if ((tache !== 2 && tache !== 3) || !text) continue;
      if (!taches.has(tache)) taches.set(tache, new Map());
      const byPartie = taches.get(tache);
      if (!byPartie.has(partie)) byPartie.set(partie, []);
      byPartie.get(partie).push(text);
    }
  }
  return [...taches.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, byPartie]) => ({
      tache: t,
      parties: [...byPartie.entries()].sort((a, b) => a[0] - b[0]).map(([partie, sujets]) => ({ partie, sujets })),
    }));
}

// Fetches one month page and returns it in our archive shape.
export async function fetchMonth(section, target) {
  const flight = flightPayload(await fetchPage(target.url));
  return section === "ee" ? parseEE(flight) : parseEO(flight);
}
