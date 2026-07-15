import { supabase } from "@/services/supabaseClient";

// Per-question analytics: records practice attempts and aggregates them for
// the admin QMS. Supabase first (table from
// supabase/migrations/20260710_question_attempts.sql), localStorage fallback
// when the table is missing — same resilience pattern as the other services.
//
// An attempt: { questionId, answered, correct, durationMs }. Aggregation is
// done over the questions currently visible in the admin table (bounded), so
// it stays cheap; a large deployment can swap getAnalytics for a SQL
// aggregate RPC without touching callers.

const LOCAL_KEY = "passerelle-question-attempts";

const localStore = {
  list() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch { return []; }
  },
  add(rows) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify([...rows, ...localStore.list()].slice(0, 5000))); } catch { /* full */ }
  },
};

const isMissingTable = (error) => error && (error.code === "42P01" || /question_attempts/.test(error.message || ""));

// Fire-and-forget: never let analytics logging interrupt a practice session.
export async function recordAttempts(userId, attempts) {
  const clean = (attempts || []).filter((a) => a.questionId);
  if (clean.length === 0) return;
  const rows = clean.map((a) => ({
    question_id: String(a.questionId),
    user_id: userId || null,
    answered: a.answered !== false,
    is_correct: a.answered === false ? null : !!a.correct,
    duration_ms: a.durationMs ?? null,
  }));
  const { error } = await supabase.from("question_attempts").insert(rows);
  if (error) {
    localStore.add(rows.map((r) => ({ questionId: r.question_id, answered: r.answered, isCorrect: r.is_correct, durationMs: r.duration_ms })));
  }
}

const EMPTY = { attempts: 0, correct: 0, skipped: 0, successRate: null, skipRate: null, avgMs: null, difficulty: null };

// Success-rate → difficulty label, with a minimum-sample guard so a single
// lucky/unlucky attempt never labels a question.
export function deriveDifficulty(successRate, attempts) {
  if (attempts < 5 || successRate === null) return null;
  if (successRate >= 75) return { label: "Facile", tone: "green" };
  if (successRate >= 45) return { label: "Moyenne", tone: "amber" };
  return { label: "Difficile", tone: "red" };
}

function aggregate(rows) {
  const answered = rows.filter((r) => r.answered);
  const correct = answered.filter((r) => r.isCorrect).length;
  const skipped = rows.length - answered.length;
  const times = answered.map((r) => r.durationMs).filter((n) => Number.isFinite(n));
  const successRate = answered.length ? Math.round((correct / answered.length) * 100) : null;
  const stat = {
    attempts: rows.length,
    correct,
    skipped,
    successRate,
    skipRate: rows.length ? Math.round((skipped / rows.length) * 100) : null,
    avgMs: times.length ? Math.round(times.reduce((s, n) => s + n, 0) / times.length) : null,
  };
  stat.difficulty = deriveDifficulty(successRate, answered.length);
  return stat;
}

// Returns a map: questionId -> aggregated stats, for the given ids only.
export async function getAnalytics(questionIds) {
  const ids = [...new Set((questionIds || []).map(String))];
  if (ids.length === 0) return {};
  const result = Object.fromEntries(ids.map((id) => [id, { ...EMPTY }]));

  const { data, error } = await supabase
    .from("question_attempts")
    .select("question_id, answered, is_correct, duration_ms")
    .in("question_id", ids);

  const rows = error
    ? localStore.list()
        .filter((r) => ids.includes(String(r.questionId)))
        .map((r) => ({ question_id: String(r.questionId), answered: r.answered, is_correct: r.isCorrect, duration_ms: r.durationMs }))
    : data;
  if (error && !isMissingTable(error)) console.warn("question_attempts:", error.message);

  const byId = {};
  for (const r of rows) (byId[r.question_id] ||= []).push({ answered: r.answered, isCorrect: r.is_correct, durationMs: r.duration_ms });
  for (const id of ids) if (byId[id]) result[id] = aggregate(byId[id]);
  return result;
}
