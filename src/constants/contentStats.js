import { getBank } from "@/services/bankService";

// Real counts of the practice content the app actually ships, so the figures on
// the landing page can never drift from what a visitor really gets.

// The quiz bank is counted live: it is already loaded on the landing page (the
// daily demo questions read from it), so this costs nothing extra.
export function countBank() {
  let questions = 0;
  let series = 0;
  for (const list of Object.values(getBank())) {
    series += list.length;
    for (const quiz of list) questions += quiz.questions?.length || 0;
  }
  return { questions, series };
}

// Exercises that live outside the quiz bank. Hard-coded rather than imported:
// pulling ~130 KB of vocabulary and grammar data into the landing bundle just to
// call .length would be a poor trade (nothing on the landing page loads them
// otherwise). Run `node scripts/count-content.mjs` to refresh these after adding
// content — it prints the current totals and flags any mismatch.
const GRAMMAR_EXERCISES = 112; // GRAMMAR_TOPICS: 7 topics × qs
const VOCAB_CARDS = 800; // VOCAB: 4 themes × 200 entries
const EE_TASKS = 18; // WRITING_TASKS (3) + EE_COMBINATIONS (5 × 3)
const EO_TASKS = 3; // SPEAKING_TASKS

export const EXERCISE_COUNT = GRAMMAR_EXERCISES + VOCAB_CARDS + EE_TASKS + EO_TASKS;

// French grouping ("3 120"), matching the site's fr-CA copy.
export const formatCount = (n) => Number(n || 0).toLocaleString("fr-CA");

// Which stat sources the admin refreshes from /api/admin/stats, and where each
// one reads its value in that payload.
export const SNAPSHOT_SOURCES = {
  users: (s) => s.users?.total,
  quizzes: (s) => s.activity?.quizzesTotal,
  exams: (s) => s.activity?.examsCompleted,
};

// Sources that need no admin upkeep: their number is fetched or computed on
// every page load, so the editor shows them read-only.
export const AUTO_SOURCES = ["questions", "series", "exercises", "students"];

// Turns a stored stat item into the string shown on the page. Auto sources are
// recomputed on every render; everything else falls back to the stored value.
// `live` carries the figures that must be fetched rather than computed
// ({ students }); `students` degrades to the last value saved with the config,
// so a failed fetch (or a database still missing the migration) shows the last
// known count instead of dropping the band to 0.
export function resolveStatValue(item, live) {
  if (item.src === "manual") return item.n;
  if (item.src === "questions") return formatCount(countBank().questions);
  if (item.src === "series") return formatCount(countBank().series);
  if (item.src === "exercises") return formatCount(EXERCISE_COUNT);
  if (item.src === "students") return formatCount(live?.students ?? item.n);
  return formatCount(item.n); // users / quizzes / exams snapshot
}
