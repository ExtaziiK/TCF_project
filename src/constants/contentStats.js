import { getBankSummary } from "@/services/bankService";
import { STAT_SOURCES, LIVE_SOURCES } from "@/constants/home";

// Real counts of the practice content the app actually ships, so the figures on
// the landing page can never drift from what a visitor really gets.

// The quiz bank is counted from its build-time manifest (plus admin quizzes),
// so the figures stay exact without the landing page downloading a single quiz.
export function countBank() {
  let questions = 0;
  let series = 0;
  for (const list of Object.values(getBankSummary())) {
    series += list.length;
    for (const quiz of list) questions += quiz.count || 0;
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

// Sources that need no admin upkeep — all of them but « Valeur libre »: their
// number is fetched or computed on every page load, so the editor shows them
// read-only.
export const AUTO_SOURCES = STAT_SOURCES.filter((s) => s !== "manual");

// Turns a stored stat item into the string shown on the page. Content counts
// are recomputed on every render; LIVE_SOURCES read `live`, the payload of
// /api/public/stats ({ students, quizzes, exams, answers, dictees,
// corrections }), and degrade to the last value saved with the config, so a
// failed fetch shows the last known count instead of dropping the band to 0.
export function resolveStatValue(item, live) {
  if (item.src === "manual") return item.n;
  if (item.src === "questions") return formatCount(countBank().questions);
  if (item.src === "series") return formatCount(countBank().series);
  if (item.src === "exercises") return formatCount(EXERCISE_COUNT);
  if (LIVE_SOURCES.includes(item.src)) return formatCount(live?.[item.src] ?? item.n);
  return formatCount(item.n);
}
