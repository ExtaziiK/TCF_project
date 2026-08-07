import { HttpError } from "../groq.js";
import { fetchPage, toLines, tidy, MONTH_SLUGS, MONTH_LABELS } from "./html.js";

// Source adapter: reussir-tcfcanada.com
//
// A WordPress site that publishes each month's reported subjects as plain
// prose. Two index pages never change address:
//   /expression-ecrite/   and   /expression-orale/
// each listing one link per month (…/aout-2026-expression-ecrite/), so the
// month is read out of the URL slug rather than the link text — the site
// mislabels one now and then ("Decembre 2024" on a 2025 page).

const ORIGIN = "https://reussir-tcfcanada.com";
const INDEX_PATH = { ee: "/expression-ecrite/", eo: "/expression-orale/" };
const SECTION_SLUG = { ee: "expression-ecrite", eo: "expression-orale" };

export const id = "reussir";
export const label = "reussir-tcfcanada.com";
export const indexUrl = (section) => `${ORIGIN}${INDEX_PATH[section]}`;

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

/* --------------------------------- months ---------------------------------- */

// Every month link on an index page, newest first.
export function monthsFrom(html, section) {
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

export async function months(section) {
  return monthsFrom(await fetchPage(indexUrl(section)), section);
}

export async function latestMonth(section) {
  const list = await months(section);
  if (!list.length) throw new HttpError(502, `Aucun lien mensuel trouvé sur ${indexUrl(section)} — la structure de la page a changé.`);
  return list[0];
}

// Fetches one month page and returns it in our archive shape.
export async function fetchMonth(section, target) {
  const lines = toLines(await fetchPage(target.url));
  return section === "ee" ? parseEE(lines) : parseEO(lines);
}
