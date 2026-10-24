// Stores model answers written outside the Groq pipeline (by hand, or by
// Claude in a working session) into sujets_answers — after the SAME measured
// checks the gate applies (api/_lib/eeSpec.js): official word range, each
// tâche's required parts, a tâche 3 synthesis that is not copied from the
// documents, and a text the dictée can read. A file with one failing answer
// stores nothing until it is fixed.
//
//   node scripts/store-model-answers.mjs 2026-10 answers.json [--dry]
//
// answers.json: [{ n, tache, title?, keywords: [],
//   tâche 1: opening, message, closing, signature
//   tâche 2: body          tâche 3: synthesis, opinion }]
//
// Stored as version 3 ("written outside the Groq gate, measured by code"), with
// no grade: the page only shows « Validé par notre correcteur » for a grade our
// grader actually gave.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(l);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const [month, file] = process.argv.slice(2);
const dry = process.argv.includes("--dry");
const [year, monthNum] = (month || "").split("-").map(Number);
if (!year || !monthNum || !file) {
  console.error("Usage: node scripts/store-model-answers.mjs 2026-10 answers.json [--dry]");
  process.exit(1);
}

const lib = (f) => import(pathToFileURL(path.resolve("api/_lib", f)).href);
const { assembleAnswer } = await lib("eeSpec.js");
const { measuredIssues, usableKeywords } = await lib("eeModelAnswer.js");

const U = process.env.VITE_SUPABASE_URL;
const H = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const rest = async (q, init = {}) => {
  const r = await fetch(`${U}/rest/v1/${q}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${q}: ${r.status} ${await r.text()}`);
  return r.status === 204 || init.method === "DELETE" ? null : r.json().catch(() => null);
};

const [row] = await rest(`sujets_archive?select=data&section=eq.ee&year=eq.${year}&month_num=eq.${monthNum}`);
if (!row) throw new Error(`${month} : mois absent de sujets_archive`);
const sujets = new Map((row.data || []).map((s, i) => [s.n ?? i + 1, s]));

const items = JSON.parse(fs.readFileSync(file, "utf8"));
const rows = [];
let bad = 0;
for (const it of items) {
  const sujet = sujets.get(it.n);
  const tache = Number(it.tache);
  if (!sujet) { console.log(`✖ #${it.n} : combinaison inconnue`); bad++; continue; }
  const a = assembleAnswer(tache, it);
  const issues = measuredIssues(tache, a, sujet);
  const keywords = usableKeywords(it.keywords, a.body);
  const id = `${month} #${it.n} T${tache}`;
  if (issues.length) { console.log(`✖ ${id} (${a.words} mots) : ${issues.join(" ; ")}`); bad++; continue; }
  console.log(`✔ ${id} — ${a.words} mots, ${keywords.length} expressions`);
  rows.push({
    section: "ee", year, month_num: monthNum, n: it.n, tache,
    title: a.title, body: a.body, keywords, words: a.words,
    score: null, criteria: null, version: 3, model: "claude", generated_at: new Date().toISOString(),
  });
}
// No process.exit(): on Windows it can abort while fetch handles are still
// closing (a libuv assertion), so the script simply runs to its end.
if (bad) {
  console.log(`\n${bad} réponse(s) à corriger : rien n'est enregistré.`);
  process.exitCode = 1;
} else if (dry) {
  console.log(`\n--dry : ${rows.length} réponse(s) valides, rien n'est enregistré.`);
} else {
  await store();
}

async function store() {

await rest("sujets_answers?on_conflict=section,year,month_num,n,tache", {
  method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows),
});
// Dictées recorded from a previous answer of these tâches are stale.
for (const r of rows) {
  await rest(`dictee_texts?sujet_key=eq.${year}-${monthNum}-${r.n}&task=eq.${r.tache}&answer_id=not.is.null`, { method: "DELETE" });
}
// Light the public link for every combinaison whose tâches all have an answer.
const have = await rest(`sujets_answers?select=n,tache&section=eq.ee&year=eq.${year}&month_num=eq.${monthNum}`);
const got = new Set(have.map((a) => `${a.n}:${a.tache}`));
const posed = (s) => [1, 2, 3].filter((k) => (k === 1 ? s.t1 : k === 2 ? s.t2 : s.t3?.theme || s.t3?.doc1 || s.t3?.doc2));
const data = (row.data || []).map((s, i) => (posed(s).every((k) => got.has(`${s.n ?? i + 1}:${k}`)) ? { ...s, a: true } : s));
await rest(`sujets_archive?section=eq.ee&year=eq.${year}&month_num=eq.${monthNum}`, { method: "PATCH", body: JSON.stringify({ data, updated_at: new Date().toISOString() }) });
console.log(`\n${rows.length} réponse(s) enregistrée(s) pour ${month}.`);
}
