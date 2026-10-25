import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { logAiUsage } from "../usage.js";
import { enforceRateLimit } from "../ratelimit.js";
import { nextStep, nextStepName, newDraft, consigneFor, measuredIssues, passes, MODEL_PASS } from "../eeModelAnswer.js";
import { assembleAnswer } from "../eeSpec.js";

// POST /api/admin/sujet-answers — writes THE model answer of one Expression
// écrite (combinaison, tâche): the text the « Modèle de réponse » page shows,
// the writing workshop offers as its example, and the dictée reads aloud.
// Backs « Générer les réponses » in the admin Sujets tab.
//
// ONE STEP PER REQUEST. A model answer is written, measured, proofread, graded
// by our own grader and revised if needed (api/_lib/eeModelAnswer.js) — four to
// seven Groq calls, two or three minutes of Groq's per-minute allowance. No
// 60 s serverless call holds that, so the draft travels: the admin page sends
// it back with each request, this handler advances it by exactly one call, and
// on a 429 the page waits the time Groq names and sends the same draft again.
// Nothing is written until the last step, and only a text that cleared the bar
// (MODEL_PASS) is published — a failing one leaves the current answer in place.
//
// The draft comes from the admin's own browser, so it is trusted no further
// than an admin is: the measured checks are re-run here on the final text
// before it is stored.
//
// Nothing reaches a non-Premium visitor: the table's RLS
// (20260913_sujets_answers.sql) gates reads on is_premium().

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const STEP_LABEL = { write: "rédaction", fix: "ajustement", proofread: "relecture", grade: "correction", revise: "révision" };

// Which tâches a combinaison poses. A subject missing one is normal; a subject
// that HAS one and gets no answer is a failure the admin page must not paper over.
export function expectedTaches(sujet) {
  return [1, 2, 3].filter((k) => consigneFor(k, sujet));
}

const sujetKeyOf = (year, monthNum, n) => `${year}-${monthNum}-${n}`;

// Strips a draft to the fields nextStep reads, so a tampered or stale draft
// cannot smuggle anything else through.
function cleanDraft(raw, tache) {
  if (!raw || typeof raw !== "object" || Number(raw.task) !== tache) return newDraft(tache);
  const base = newDraft(tache);
  for (const k of Object.keys(base)) if (k in raw) base[k] = raw[k];
  return base;
}

export async function publish({ year, monthNum, n, tache, draft, sujet, userId, model }) {
  // Re-measured from the text itself, not taken from the draft.
  const answer = assembleAnswer(tache, draft.json || {});
  const issues = measuredIssues(tache, answer, sujet);
  if (issues.length || !passes(draft.grade)) return { published: false, issues };
  const row = {
    section: "ee",
    year,
    month_num: monthNum,
    n,
    tache,
    title: answer.title,
    body: answer.body,
    keywords: (draft.answer?.keywords || []).filter((k) => answer.body.toLowerCase().includes(String(k).toLowerCase())),
    words: answer.words,
    score: draft.grade.score,
    criteria: draft.grade.criteria,
    version: 2,
    model,
    generated_at: new Date().toISOString(),
    updated_by: userId,
  };
  const { data: before } = await admin.from("sujets_answers").select("id, body")
    .eq("section", "ee").eq("year", year).eq("month_num", monthNum).eq("n", n).eq("tache", tache).maybeSingle();
  let { error } = await admin.from("sujets_answers").upsert(row, { onConflict: "section,year,month_num,n,tache" });
  // 20261024_ee_model_answers.sql not applied yet: store the text without its
  // grade rather than lose it. The title then rides at the top of the body.
  if (error && /column|schema cache/i.test(error.message || "")) {
    const legacy = Object.fromEntries(Object.entries(row).filter(([k]) => !["title", "words", "score", "criteria", "version"].includes(k)));
    ({ error } = await admin.from("sujets_answers").upsert({ ...legacy, body: row.title ? `${row.title}\n\n${row.body}` : row.body }, { onConflict: "section,year,month_num,n,tache" }));
  }
  if (error) throw new HttpError(500, `Enregistrement impossible : ${error.message}`);
  // A dictée recorded from the previous version of this answer is now stale:
  // removed, so the next seed or draw records the new text. Every score taken
  // on it stays in dictee_sessions (the link is `on delete set null`). A dictée
  // the dictée wrote for itself (answer_id null) is left in the library — the
  // draw upgrades it to this answer the next time someone opens it.
  if (!before || before.body !== row.body) {
    await admin.from("dictee_texts").delete().eq("sujet_key", sujetKeyOf(year, monthNum, n)).eq("task", tache).not("answer_id", "is", null);
  }
  return { published: true, issues: [] };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await requireAdmin(req);

    const { section, year, monthNum, n, tache: rawTache, t1, t2, t3 } = req.body || {};
    if (section !== "ee") throw new HttpError(400, "Les modèles de réponse n'existent que pour l'expression écrite.");
    if (!Number.isInteger(year) || !Number.isInteger(monthNum) || !Number.isInteger(n)) {
      throw new HttpError(400, "Mois ou combinaison invalide.");
    }
    const sujet = { t1, t2, t3 };
    const expected = expectedTaches(sujet);
    if (!expected.length) throw new HttpError(400, "Cette combinaison n'a aucune tâche à corriger.");
    const tache = Number(rawTache);
    if (!expected.includes(tache)) throw new HttpError(400, `La tâche ${rawTache} n'existe pas dans cette combinaison.`);

    // A month is ~21 answers of four to seven steps each, plus the retries on
    // Groq's per-minute limit — generous on purpose. It stops a stuck loop,
    // not the work.
    await enforceRateLimit(req, { name: "sujet-answers", limit: 240, windowSeconds: 600, userId: user.id });

    const draft = cleanDraft(req.body?.draft, tache);
    const r = await nextStep(draft, sujet);
    for (const m of r.meter) {
      logAiUsage({ userId: user.id, endpoint: "admin/sujet-answers", kind: "chat", model: m.model, usage: m.usage, durationMs: m.ms });
    }

    let published = false;
    let issues = r.draft.issues;
    if (r.draft.done) {
      ({ published, issues } = await publish({
        year, monthNum, n, tache, draft: r.draft, sujet, userId: user.id,
        model: r.meter[r.meter.length - 1]?.model || null,
      }));
    }

    const next = nextStepName(r.draft);
    res.status(200).json({
      n,
      tache,
      expected,
      step: r.step,
      next,
      nextLabel: next ? STEP_LABEL[next] : null,
      done: r.draft.done,
      published,
      grade: r.draft.grade ? { score: r.draft.grade.score, criteria: r.draft.grade.criteria } : null,
      words: r.draft.answer?.words ?? null,
      // Why a finished draft was not published: the measured problems, or the
      // grade under the bar. The admin sees it and the old answer stays.
      reason: r.draft.done && !published
        ? issues.length ? issues.join(" ; ") : `note ${r.draft.grade?.score ?? "?"}/20 sous le seuil (${MODEL_PASS.score}/20, ${MODEL_PASS.criterion} par critère)`
        : null,
      draft: r.draft.done ? null : r.draft,
    });
  } catch (err) {
    // Groq's per-minute limit: not a failure. The page waits `retryAfterMs`
    // and sends the same draft again.
    res.status(err.status || 500).json({
      error: err.message || "La génération du modèle de réponse a échoué.",
      ...(err.retryAfterMs ? { retryAfterMs: err.retryAfterMs } : {}),
    });
  }
}
