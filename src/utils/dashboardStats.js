import { LEVELS } from "@/constants/levels";

const levelFromPct = (pct) => (pct >= 85 ? "C1" : pct >= 65 ? "B2" : pct >= 40 ? "B1" : "A2");
const nextLevel = (level) => LEVELS[Math.min(LEVELS.indexOf(level) + 1, LEVELS.length - 1)];
const dateKey = (d) => new Date(d).toLocaleDateString("en-CA"); // stable YYYY-MM-DD, ignores locale format

const SECTION_TITLES = { co: "Compréhension orale", ce: "Compréhension écrite", ee: "Expression écrite", eo: "Expression orale" };

// Derives every real dashboard metric from the user's completed exam
// attempts (src/services/examService.js) plus standalone practice-quiz
// results (src/services/quizResultsService.js) - no mock data. The two
// sources never overlap: Quiz.jsx skips recording a quiz_results row for
// mock-exam tasks (storageKey "mock-..."), since exam_attempts already
// tracks those in full. ee/eo tasks are self-assessed (no ok/total), so
// they're reported as a completion count rather than a percentage.
export function computeDashboardStats(attempts, quizResults) {
  const completed = (attempts || []).filter((a) => a.status === "completed" && a.score);
  const results = quizResults || [];

  let studyMinutes = 0;
  let exercises = 0;
  let pctSum = 0;
  let pctCount = 0;
  const bySection = { co: { ok: 0, total: 0 }, ce: { ok: 0, total: 0 }, ee: { count: 0 }, eo: { count: 0 } };
  const activeDays = new Set();

  for (const a of completed) {
    const start = new Date(a.startedAt).getTime();
    const end = new Date(a.completedAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      studyMinutes += Math.round((end - start) / 60000);
    }
    pctSum += a.score.pct || 0;
    pctCount++;
    activeDays.add(dateKey(a.completedAt));

    for (const t of a.score.perTask || []) {
      if (t.type && t.type !== "quiz") {
        bySection[t.section].count += 1;
        exercises += 1;
      } else {
        bySection[t.section].ok += t.ok;
        bySection[t.section].total += t.total;
        exercises += t.total;
      }
    }
  }

  for (const r of results) {
    if (r.durationSec) studyMinutes += Math.round(r.durationSec / 60);
    pctSum += r.pct || 0;
    pctCount++;
    exercises += r.total || 0;
    activeDays.add(dateKey(r.completedAt));
    if (r.section && bySection[r.section] && "total" in bySection[r.section]) {
      bySection[r.section].ok += r.ok;
      bySection[r.section].total += r.total;
    }
  }

  const avgPct = pctCount ? Math.round(pctSum / pctCount) : 0;
  const currentLevel = pctCount ? levelFromPct(avgPct) : "A2";

  let streak = 0;
  const cursor = new Date();
  if (!activeDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dateKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekStudied = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return activeDays.has(dateKey(d));
  });

  const sectionBreakdown = ["co", "ce", "ee", "eo"].map((s) => {
    const b = bySection[s];
    if (s === "ee" || s === "eo") return { section: s, title: SECTION_TITLES[s], selfAssessed: true, count: b.count };
    const pct = b.total ? Math.round((b.ok / b.total) * 100) : 0;
    return { section: s, title: SECTION_TITLES[s], pct, level: b.total ? levelFromPct(pct) : "—" };
  });

  const examHistory = completed.map((a) => ({
    id: `exam-${a.id}`,
    title: "Examen blanc TCF Canada",
    at: a.completedAt,
    min: Math.max(1, Math.round((new Date(a.completedAt) - new Date(a.startedAt)) / 60000)),
    score: `${a.score.points} / 699`,
  }));
  const quizHistory = results.map((r, i) => ({
    id: `quiz-${r.quizKey}-${r.completedAt}-${i}`,
    title: `Quiz · ${SECTION_TITLES[r.section] || "Pratique"}`,
    at: r.completedAt,
    min: r.durationSec ? Math.max(1, Math.round(r.durationSec / 60)) : 1,
    score: `${r.pct} %`,
  }));
  const recentHistory = [...examHistory, ...quizHistory]
    .sort((x, y) => new Date(y.at) - new Date(x.at))
    .slice(0, 5)
    .map((h) => ({ ...h, date: new Date(h.at).toLocaleDateString("fr-CA", { day: "numeric", month: "long" }) }));

  return {
    studyMinutes,
    exercises,
    avgPct,
    streak,
    weekStudied,
    currentLevel,
    targetLevel: nextLevel(currentLevel),
    sectionBreakdown,
    recentHistory,
    hasData: pctCount > 0,
  };
}

export function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}
