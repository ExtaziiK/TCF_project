// Counts the practice content actually shipped in src/, and checks it against
// the figures hard-coded in src/constants/contentStats.js — the numbers the
// landing page's "Statistique" band shows for grammar/vocabulary/EE/EO.
//
// The quiz bank is counted at runtime by the app (it is already loaded on the
// landing page), so it is reported here for information only. The other totals
// cannot be counted at runtime without pulling ~130 KB of data into the landing
// bundle, hence the constants — run this after adding content and update them.
//
//   node scripts/count-content.mjs
//
// Exits non-zero if a constant has drifted from the real content.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const countOf = (text, re) => (text.match(re) || []).length;

// ── quiz bank (informational: counted live by src/constants/contentStats.js) ──
let bankQuestions = 0;
let bankSeries = 0;
for (const section of ["co", "ce", "ee", "eo"]) {
  const dir = path.join(root, "src/bank", section);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const json = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    const questions = Array.isArray(json) ? json : (json.questions || json.detailed_answers || []);
    bankQuestions += questions.length;
    bankSeries++;
  }
}

// ── content counted by regex (the modules use @/ aliases, so no import here) ──
const grammar = read("src/constants/grammar.js");
const writing = read("src/constants/writing.js");
const speaking = read("src/constants/speaking.js");

const vocab = ["immigration", "travail", "vie-quotidienne", "etudes"]
  .reduce((n, f) => n + countOf(read(`src/constants/vocab/${f}.js`), /\{ fr: /g), 0);

const real = {
  GRAMMAR_EXERCISES: countOf(grammar, /\{ q: "/g),
  VOCAB_CARDS: vocab,
  EE_TASKS: countOf(writing, /prompt: /g),
  EO_TASKS: countOf(speaking, /prompt: /g),
};

// ── compare against the declared constants ───────────────────────────────────
const declared = {};
for (const [name] of Object.entries(real)) {
  const m = read("src/constants/contentStats.js").match(new RegExp(`const ${name} = (\\d+)`));
  declared[name] = m ? Number(m[1]) : null;
}

console.log(`Banc de questions (compté à l'exécution) : ${bankQuestions} questions · ${bankSeries} séries`);
let drifted = false;
for (const [name, count] of Object.entries(real)) {
  const ok = declared[name] === count;
  if (!ok) drifted = true;
  console.log(`${ok ? "ok  " : "DRIFT"} ${name}: réel ${count}${ok ? "" : ` · déclaré ${declared[name]}`}`);
}
const total = Object.values(real).reduce((a, b) => a + b, 0);
console.log(`EXERCISE_COUNT attendu : ${total}`);

if (drifted) {
  console.error("\nMettez à jour src/constants/contentStats.js avec les valeurs réelles ci-dessus.");
  process.exit(1);
}
