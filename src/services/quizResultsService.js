import { supabase } from "@/services/supabaseClient";

// Standalone practice-quiz results (bank/practice/reading/listening quizzes).
// Mock-exam quizzes are excluded (storageKey prefix "mock-") since those are
// already tracked in full by examService's exam_attempts table - recording
// them here too would double-count exercises/study-time in dashboard stats.
//
// Supabase first, localStorage when the table is missing (error 42P01) or no
// user id is available - same resilience pattern as examService.js.

const LOCAL_KEY = (userId) => `passerelle-quiz-results-${userId || "anon"}`;

const localStore = {
  list(userId) {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY(userId))) || []; } catch { return []; }
  },
  add(userId, row) {
    try { localStorage.setItem(LOCAL_KEY(userId), JSON.stringify([row, ...localStore.list(userId)])); } catch { /* storage full/blocked */ }
  },
};

const isMissingTable = (error) => error && (error.code === "42P01" || /quiz_results/.test(error.message || ""));
// Postgres "undefined column" (42703) or PostgREST's schema-cache miss (PGRST204) —
// happens when the `answers` migration hasn't been applied to this database yet.
const isMissingAnswersColumn = (error) => error && (error.code === "42703" || error.code === "PGRST204" || /answers/.test(error.message || ""));

const rowToResult = (r) => ({
  quizKey: r.quiz_key,
  section: r.section,
  ok: r.ok,
  total: r.total,
  answered: r.answered, // null on rows predating the column → treated as full
  pct: r.pct,
  durationSec: r.duration_sec,
  completedAt: r.completed_at,
  answers: r.answers ?? null, // per-question detail; null on rows predating the column
});

export async function listQuizResults(userId) {
  const { data, error } = await supabase
    .from("quiz_results")
    .select("*")
    .order("completed_at", { ascending: false });
  if (error) {
    if (!isMissingTable(error)) console.warn("quiz_results:", error.message);
    return { results: localStore.list(userId), backend: "local" };
  }
  return { results: data.map(rowToResult), backend: "supabase" };
}

export async function recordQuizResult(userId, { quizKey, section, ok, total, answered, durationSec, answers }) {
  if (!quizKey || !total) return;
  const pct = Math.round((ok / total) * 100);
  const ans = answered ?? total;
  const base = { user_id: userId, quiz_key: quizKey, section: section || null, ok, total, answered: ans, pct, duration_sec: durationSec ?? null };
  let { error } = await supabase.from("quiz_results").insert({ ...base, answers: answers ?? null });
  if (error && isMissingAnswersColumn(error)) {
    // The `answers` migration isn't applied on this database yet — still record
    // the score itself rather than losing the whole attempt to localStorage.
    ({ error } = await supabase.from("quiz_results").insert(base));
  }
  if (error) {
    localStore.add(userId, { quizKey, section: section || null, ok, total, answered: ans, pct, durationSec: durationSec ?? null, answers: answers ?? null, completedAt: new Date().toISOString() });
  }
}

// Highest-pct attempt per quiz key, for the "meilleur score" badge.
export function bestScoresByKey(results) {
  const map = {};
  for (const r of results) {
    if (!map[r.quizKey] || r.pct > map[r.quizKey].pct) map[r.quizKey] = r;
  }
  return map;
}

// Most recent attempt per quiz key that has per-question detail on record, for
// the "review this attempt" button — deliberately independent of the best
// score above: the highest-scoring attempt may predate this feature (or a
// pending migration) and carry no `answers`, while a more recent attempt does.
// `results` is already ordered newest-first by listQuizResults.
export function reviewableAttemptsByKey(results) {
  const map = {};
  for (const r of results) {
    if (!map[r.quizKey] && Array.isArray(r.answers) && r.answers.length > 0) map[r.quizKey] = r;
  }
  return map;
}
