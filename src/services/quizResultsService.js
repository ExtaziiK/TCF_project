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

const rowToResult = (r) => ({
  quizKey: r.quiz_key,
  section: r.section,
  ok: r.ok,
  total: r.total,
  answered: r.answered, // null on rows predating the column → treated as full
  pct: r.pct,
  durationSec: r.duration_sec,
  completedAt: r.completed_at,
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

export async function recordQuizResult(userId, { quizKey, section, ok, total, answered, durationSec }) {
  if (!quizKey || !total) return;
  const pct = Math.round((ok / total) * 100);
  const ans = answered ?? total;
  const { error } = await supabase.from("quiz_results").insert({
    user_id: userId, quiz_key: quizKey, section: section || null, ok, total, answered: ans, pct, duration_sec: durationSec ?? null,
  });
  if (error) {
    localStore.add(userId, { quizKey, section: section || null, ok, total, answered: ans, pct, durationSec: durationSec ?? null, completedAt: new Date().toISOString() });
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
