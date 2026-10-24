// Writes THE graded model answer of every Expression écrite tâche of the given
// months — the same pipeline as Admin › Sujets « Générer les réponses »
// (api/_lib/eeModelAnswer.js, published by api/_lib/admin/sujetAnswers.js),
// run from a terminal where there is no 60 s limit.
//
//   node scripts/backfill-model-answers.mjs 2026-10 2026-09 [--budget 100000] [--redo]
//
// Months are done in the order given, combinaisons in order. Resumable: a tâche
// whose answer was already written by the gate (version 2) is skipped, so a
// run stopped by Groq's daily allowance continues where it left off.
//
// --budget caps the tokens of gpt-oss-120b this run may spend (default 100 000,
// half the free tier's daily allowance): the same key serves the candidates'
// corrections, and the large model is their fallback. Reads .env.local
// (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(l);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const args = process.argv.slice(2);
const months = args.filter((a) => /^\d{4}-\d{1,2}$/.test(a)).map((a) => a.split("-").map(Number));
const budget = Number(args[args.indexOf("--budget") + 1]) || 100_000;
const redo = args.includes("--redo");
if (!months.length) {
  console.error("Usage: node scripts/backfill-model-answers.mjs 2026-10 [2026-09 …] [--budget 100000] [--redo]");
  process.exit(1);
}

const lib = (f) => import(pathToFileURL(path.resolve("api/_lib", f)).href);
const { nextStep, newDraft } = await lib("eeModelAnswer.js");
const { publish, expectedTaches } = await lib("admin/sujetAnswers.js");

const U = process.env.VITE_SUPABASE_URL;
const H = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const rest = async (q, init = {}) => {
  const r = await fetch(`${U}/rest/v1/${q}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${q}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};
const sleep = (ms) => new Promise((r) => globalThis.setTimeout(r, ms));

const logFile = path.resolve("scripts", `backfill-${new Date().toISOString().slice(0, 10)}.log.jsonl`);
const log = (o) => fs.appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), ...o })}\n`);

let spent = 0; // gpt-oss-120b tokens this run
const report = { published: [], rejected: [], errors: [], skipped: 0, stopped: null };

// Every step of one tâche, waiting out the per-minute limit. Returns the
// finished draft, or throws "DAILY" when the day's allowance is gone.
async function oneAnswer(sujet, tache) {
  let draft = newDraft(tache);
  for (let waits = 0; ;) {
    if (spent >= budget) throw new Error("BUDGET");
    try {
      const r = await nextStep(draft, sujet);
      for (const m of r.meter) if (/120b/.test(m.model || "")) spent += m.usage?.total_tokens || 0;
      draft = r.draft;
      if (draft.done) return draft;
    } catch (err) {
      const daily = /per day|TPD/i.test(err.upstreamDetail || "") || (err.retryAfterMs || 0) > 120_000;
      if ((err.status === 429 || err.upstreamStatus === 429) && !daily && waits < 10) {
        waits += 1;
        await sleep(Math.min(Math.max(err.retryAfterMs || 20_000, 5_000), 65_000));
        continue;
      }
      if (daily) throw new Error("DAILY");
      throw err;
    }
  }
}

outer: for (const [year, monthNum] of months) {
  const [row] = await rest(`sujets_archive?select=data&section=eq.ee&year=eq.${year}&month_num=eq.${monthNum}`);
  if (!row) { console.log(`${year}-${monthNum} : mois absent de sujets_archive, ignoré`); continue; }
  const have = await rest(`sujets_answers?select=n,tache,version&section=eq.ee&year=eq.${year}&month_num=eq.${monthNum}`);
  const graded = new Set(have.filter((a) => a.version === 2).map((a) => `${a.n}:${a.tache}`));
  const data = row.data || [];

  for (let i = 0; i < data.length; i++) {
    const s = data[i];
    const n = s.n ?? i + 1;
    const sujet = { t1: s.t1, t2: s.t2, t3: s.t3 };
    for (const tache of expectedTaches(sujet)) {
      if (!redo && graded.has(`${n}:${tache}`)) { report.skipped++; continue; }
      const id = `${year}-${String(monthNum).padStart(2, "0")} #${n} T${tache}`;
      const t0 = Date.now();
      try {
        const draft = await oneAnswer(sujet, tache);
        const { published, issues } = await publish({ year, monthNum, n, tache, draft, sujet, userId: null, model: "openai/gpt-oss-120b" });
        const line = { id, score: draft.grade?.score, words: draft.answer?.words, secs: Math.round((Date.now() - t0) / 1000) };
        if (published) { report.published.push(line); graded.add(`${n}:${tache}`); }
        else report.rejected.push({ ...line, why: issues.length ? issues.join(" ; ") : `note ${draft.grade?.score}/20` });
        log({ ...line, published, issues });
        console.log(`${published ? "✔" : "✖"} ${id} — ${draft.grade?.score ?? "?"}/20, ${draft.answer?.words} mots, ${line.secs}s · 120b ${spent}/${budget}`);
      } catch (err) {
        if (err.message === "BUDGET" || err.message === "DAILY") {
          report.stopped = err.message === "BUDGET" ? `budget de ${budget} jetons atteint` : "quota Groq du jour atteint";
          console.log(`■ arrêt : ${report.stopped}`);
          break outer;
        }
        report.errors.push({ id, error: err.message });
        log({ id, error: err.message });
        console.log(`! ${id} — ${err.message}`);
      }
    }
  }
}

// The public « Voir un modèle de réponse » link: lit for every combinaison of
// these months whose tâches all have an answer now.
for (const [year, monthNum] of months) {
  const [row] = await rest(`sujets_archive?select=data&section=eq.ee&year=eq.${year}&month_num=eq.${monthNum}`);
  if (!row) continue;
  const have = await rest(`sujets_answers?select=n,tache&section=eq.ee&year=eq.${year}&month_num=eq.${monthNum}`);
  const got = new Set(have.map((a) => `${a.n}:${a.tache}`));
  let changed = false;
  const data = (row.data || []).map((s, i) => {
    const n = s.n ?? i + 1;
    const full = expectedTaches(s).every((k) => got.has(`${n}:${k}`));
    if (full && s.a !== true) { changed = true; return { ...s, a: true }; }
    return s;
  });
  if (changed) {
    await rest(`sujets_archive?section=eq.ee&year=eq.${year}&month_num=eq.${monthNum}`, { method: "PATCH", body: JSON.stringify({ data, updated_at: new Date().toISOString() }) });
  }
}

const scores = report.published.map((p) => p.score);
console.log(`\nPubliés : ${report.published.length}${scores.length ? ` (moyenne ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}/20)` : ""} · non publiés : ${report.rejected.length} · erreurs : ${report.errors.length} · déjà faits : ${report.skipped} · 120b : ${spent} jetons${report.stopped ? ` · ${report.stopped}` : ""}`);
for (const r of report.rejected) console.log(`  non publié ${r.id} : ${r.why}`);
for (const e of report.errors) console.log(`  erreur ${e.id} : ${e.error}`);
log({ summary: { ...report, spent } });
