import { getBank } from "@/services/bankService";
import { SECTION_LABELS } from "@/utils/bankAdapter";

// Pure progress engine for the member dashboard. Everything is derived from
// the user's stored history — practice-quiz results (quizResultsService) and
// mock-exam attempts (examService) — plus the live question bank. No metric
// is hardcoded: add quizzes to the bank or rows to the history and every
// number, level, badge, recommendation and chart updates by itself.
//
// computeProgress() is a pure function so it can be unit-tested and reused
// (weekly emails, leaderboards, AI study plans…) without touching the UI.

const dateKey = (d) => new Date(d).toLocaleDateString("en-CA"); // YYYY-MM-DD
const SCORED_SECTIONS = ["co", "ce"]; // ee/eo become scored automatically once their bank quizzes land

/* ------------------------------ XP & levels ------------------------------ */

export const XP_RULES = {
  perCorrectAnswer: 2,
  perQuizCompleted: 10,
  perExamCompleted: 20,
  perActiveDay: 5, // daily practice bonus
  perFullStreakWeek: 30, // weekly streak bonus
};

// Levels combine an XP threshold with multi-factor requirements (volume,
// score quality, breadth of sections, consistency) — never a single metric.
export const USER_LEVELS = [
  { name: "Débutant", xp: 0 },
  { name: "Élémentaire", xp: 150, min: { quizzes: 3 } },
  { name: "Intermédiaire", xp: 400, min: { quizzes: 8, sections: 2 } },
  { name: "Intermédiaire supérieur", xp: 900, min: { quizzes: 15, sections: 2, avg: 50 } },
  { name: "Avancé", xp: 1800, min: { quizzes: 25, sections: 3, avg: 60 } },
  { name: "Expert", xp: 3200, min: { quizzes: 40, sections: 3, avg: 70 } },
  { name: "Maître TCF", xp: 5500, min: { quizzes: 60, sections: 4, avg: 80, streak: 7 } },
];

const meetsRequirements = (min, facts) =>
  !min ||
  ((min.quizzes ?? 0) <= facts.quizzes &&
    (min.sections ?? 0) <= facts.sections &&
    (min.avg ?? 0) <= facts.avg &&
    (min.streak ?? 0) <= facts.longestStreak);

/* ------------------------------ main compute ----------------------------- */

export function computeProgress({ results = [], attempts = [] }) {
  const bank = getBank();
  const exams = attempts.filter((a) => a.status === "completed" && a.score);
  const inProgressExam = attempts.find((a) => a.status === "in_progress") || null;

  /* ---- flatten history into one chronological event list ---- */
  const events = [
    ...results.map((r) => ({
      kind: "quiz", at: r.completedAt, section: r.section, ok: r.ok, total: r.total, pct: r.pct,
      quizKey: r.quizKey, minutes: r.durationSec ? Math.max(1, Math.round(r.durationSec / 60)) : 1,
    })),
    ...exams.map((a) => ({
      kind: "exam", at: a.completedAt, ok: a.score.ok, total: a.score.total, pct: a.score.pct,
      points: a.score.points,
      minutes: Math.max(1, Math.round((new Date(a.completedAt) - new Date(a.startedAt)) / 60000)),
    })),
  ].filter((e) => e.at).sort((a, b) => new Date(a.at) - new Date(b.at));

  /* ---- totals ---- */
  const questionsAnswered = events.reduce((s, e) => s + (e.total || 0), 0);
  const correctAnswers = events.reduce((s, e) => s + (e.ok || 0), 0);
  const quizzesCompleted = results.length;
  const examsCompleted = exams.length;
  const studyMinutes = events.reduce((s, e) => s + e.minutes, 0);
  const scored = events.filter((e) => e.total > 0);
  const avgScore = scored.length ? Math.round(scored.reduce((s, e) => s + e.pct, 0) / scored.length) : 0;
  const correctRate = questionsAnswered ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
  const lastActivity = events.length ? events[events.length - 1].at : null;

  /* ---- streaks & calendar ---- */
  const activeDays = new Set(events.map((e) => dateKey(e.at)));
  const streaks = computeStreaks(activeDays);
  const calendar = monthCalendar(activeDays);

  /* ---- overall completion: distinct bank quizzes attempted ---- */
  const bankKeys = new Set(
    Object.values(bank).flat().map((q) => `bank-${q.id}`)
  );
  const attemptedKeys = new Set(results.map((r) => r.quizKey).filter((k) => bankKeys.has(k)));
  const completionPct = bankKeys.size ? Math.round((attemptedKeys.size / bankKeys.size) * 100) : 0;

  /* ---- per-section stats ---- */
  const sections = Object.keys(bank).map((s) => sectionStats(s, bank, results));
  const sectionsPracticed = sections.filter((s) => s.quizzesCompleted > 0).length;

  /* ---- XP ---- */
  const xp =
    correctAnswers * XP_RULES.perCorrectAnswer +
    quizzesCompleted * XP_RULES.perQuizCompleted +
    examsCompleted * XP_RULES.perExamCompleted +
    activeDays.size * XP_RULES.perActiveDay +
    Math.floor(streaks.longest / 7) * XP_RULES.perFullStreakWeek;

  /* ---- level (multi-factor) ---- */
  const facts = { quizzes: quizzesCompleted + examsCompleted, sections: sectionsPracticed, avg: avgScore, longestStreak: streaks.longest };
  let levelIdx = 0;
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= USER_LEVELS[i].xp && meetsRequirements(USER_LEVELS[i].min, facts)) { levelIdx = i; break; }
  }
  const level = USER_LEVELS[levelIdx];
  const nextLevel = USER_LEVELS[levelIdx + 1] || null;
  const xpForNext = nextLevel ? nextLevel.xp - level.xp : 0;
  // XP can outrun the next threshold while the multi-factor requirements
  // (volume, breadth, consistency) still gate the level — cap the bar and
  // flag it so the UI explains what is actually missing.
  const xpIntoLevel = nextLevel ? Math.min(xp - level.xp, xpForNext) : 0;
  const xpRemaining = nextLevel ? Math.max(0, nextLevel.xp - xp) : 0;
  const levelGated = !!nextLevel && xpRemaining === 0;

  /* ---- weekly slice (current week, Monday-based) ---- */
  const week = weeklySlice(events);

  /* ---- charts ---- */
  const charts = {
    scoreSeries: scored.slice(-12).map((e) => ({ pct: e.pct, at: e.at, label: e.kind === "exam" ? "Examen blanc" : SECTION_LABELS[e.section] || "Quiz" })),
    weekBars: week.days, // [{label, count, xp}]
    sectionPerf: sections.filter((s) => s.scored && s.avg !== null).map((s) => ({ label: s.title, pct: s.avg })),
  };

  /* ---- weekly goal (targets are config, progress is data) ---- */
  const weeklyGoal = {
    targets: { quizzes: 5, days: 4, xp: 300 },
    current: { quizzes: week.quizzes, days: week.activeDays, xp: week.xp },
  };

  const progress = {
    hasData: events.length > 0,
    totals: { completionPct, quizzesCompleted, examsCompleted, questionsAnswered, correctAnswers, correctRate, avgScore, studyMinutes, lastActivity },
    streaks: { ...streaks, calendar },
    xp: { total: xp, level: level.name, levelIdx, nextLevel: nextLevel?.name || null, xpIntoLevel, xpForNext, xpRemaining, levelGated },
    sections,
    charts,
    weeklyGoal,
    week,
    continueCard: continueCard(inProgressExam, results),
    recentActivity: [...events].reverse().slice(0, 6).map(activityItem),
  };
  progress.achievements = achievements(progress);
  progress.recommendations = recommendations(progress, bank, results);
  progress.insights = insights(progress, events);
  return progress;
}

/* ------------------------------- helpers -------------------------------- */

function computeStreaks(activeDays) {
  // current: walk back from today (or yesterday if today untouched)
  let current = 0;
  const cursor = new Date();
  if (!activeDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dateKey(cursor))) { current++; cursor.setDate(cursor.getDate() - 1); }
  // longest: scan sorted days
  const days = [...activeDays].sort();
  let longest = 0, run = 0, prev = null;
  for (const d of days) {
    run = prev && (new Date(d) - new Date(prev)) === 86400000 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest, practicedToday: activeDays.has(dateKey(new Date())) };
}

function monthCalendar(activeDays) {
  const now = new Date();
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: total }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
    return { day: i + 1, active: activeDays.has(dateKey(d)), future: d > now };
  });
  const practiced = days.filter((d) => d.active).length;
  const missed = days.filter((d) => !d.active && !d.future).length;
  return { days, practiced, missed, monthLabel: now.toLocaleDateString("fr-CA", { month: "long", year: "numeric" }) };
}

function weeklySlice(events) {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const days = labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateKey(d);
    const dayEvents = events.filter((e) => dateKey(e.at) === key);
    const xp = dayEvents.reduce((s, e) => s + (e.ok || 0) * XP_RULES.perCorrectAnswer + (e.kind === "exam" ? XP_RULES.perExamCompleted : XP_RULES.perQuizCompleted), 0);
    return { label, count: dayEvents.length, xp };
  });
  const thisWeek = events.filter((e) => new Date(e.at) >= monday);
  return {
    days,
    quizzes: thisWeek.length,
    activeDays: new Set(thisWeek.map((e) => dateKey(e.at))).size,
    xp: days.reduce((s, d) => s + d.xp, 0),
  };
}

function sectionStats(section, bank, results) {
  const bankQuizzes = bank[section];
  const rows = results.filter((r) => r.section === section);
  const scoredRows = rows.filter((r) => r.total > 0);
  const byKey = {};
  for (const r of rows) {
    if (!byKey[r.quizKey] || r.pct > byKey[r.quizKey].pct) byKey[r.quizKey] = r;
  }
  const attempted = Object.keys(byKey).filter((k) => bankQuizzes.some((q) => `bank-${q.id}` === k));
  const best = scoredRows.length ? Math.max(...scoredRows.map((r) => r.pct)) : null;
  const avg = scoredRows.length ? Math.round(scoredRows.reduce((s, r) => s + r.pct, 0) / scoredRows.length) : null;
  // strongest / weakest attempted bank quiz (by best attempt)
  const ranked = attempted
    .map((k) => ({ key: k, pct: byKey[k].pct, number: bankQuizzes.findIndex((q) => `bank-${q.id}` === k) + 1 }))
    .sort((a, b) => b.pct - a.pct);
  return {
    section,
    title: SECTION_LABELS[section],
    scored: SCORED_SECTIONS.includes(section) || bankQuizzes.length > 0,
    bankCount: bankQuizzes.length,
    quizzesCompleted: rows.length,
    attemptedCount: attempted.length,
    completionPct: bankQuizzes.length ? Math.round((attempted.length / bankQuizzes.length) * 100) : 0,
    best,
    avg,
    cefr: avg === null ? null : avg >= 85 ? "C1" : avg >= 65 ? "B2" : avg >= 40 ? "B1" : "A2",
    strongest: ranked[0] || null,
    weakest: ranked.length > 1 ? ranked[ranked.length - 1] : null,
  };
}

function continueCard(inProgressExam, results) {
  if (inProgressExam) {
    const done = Object.keys(inProgressExam.progress?.results || {}).length;
    return {
      kind: "exam",
      title: "Reprendre votre examen blanc",
      detail: `Tâche ${Math.min((inProgressExam.progress?.taskIndex || 0) + 1, inProgressExam.tasks.length)} / ${inProgressExam.tasks.length} · ${done} terminée${done > 1 ? "s" : ""}`,
      route: "mocks",
      cta: "Reprendre",
    };
  }
  const last = results[0];
  if (last) {
    const quiz = Object.values(getBank()).flat().find((q) => `bank-${q.id}` === last.quizKey);
    if (quiz && last.pct < 100) {
      return {
        kind: "retry",
        title: `Refaire le dernier quiz (${SECTION_LABELS[last.section] || "Pratique"})`,
        detail: `Dernier score : ${last.pct} % · ${quiz.questions.length - last.ok} question${quiz.questions.length - last.ok > 1 ? "s" : ""} à corriger`,
        route: last.section === "ce" ? "reading" : last.section === "co" ? "listening" : "practice",
        cta: "Rejouer",
      };
    }
  }
  return null;
}

function activityItem(e) {
  const date = new Date(e.at).toLocaleDateString("fr-CA", { day: "numeric", month: "long" });
  const xp = (e.ok || 0) * XP_RULES.perCorrectAnswer + (e.kind === "exam" ? XP_RULES.perExamCompleted : XP_RULES.perQuizCompleted);
  return e.kind === "exam"
    ? { title: "Examen blanc terminé", meta: `${e.points} / 699 · ${date}`, xp, kind: e.kind }
    : { title: `Quiz ${SECTION_LABELS[e.section] || "de pratique"} terminé`, meta: `${e.pct} % · ${date}`, xp, kind: e.kind };
}

/* ----------------------------- achievements ------------------------------ */

export function achievements(p) {
  const t = p.totals;
  const co = p.sections.find((s) => s.section === "co");
  const ce = p.sections.find((s) => s.section === "ce");
  const anyPerfect = p.charts.scoreSeries.some((e) => e.pct === 100) || p.sections.some((s) => s.best === 100);
  return [
    { id: "first-quiz", title: "Premier quiz", desc: "Terminer un premier quiz", earned: t.quizzesCompleted + t.examsCompleted >= 1 },
    { id: "ten-quizzes", title: "10 quiz terminés", desc: "Terminer 10 quiz", earned: t.quizzesCompleted >= 10 },
    { id: "hundred-correct", title: "100 bonnes réponses", desc: "Cumuler 100 bonnes réponses", earned: t.correctAnswers >= 100 },
    { id: "listening-expert", title: "Expert écoute", desc: "Moyenne ≥ 80 % en CO (5 quiz min.)", earned: !!co && co.quizzesCompleted >= 5 && co.avg >= 80 },
    { id: "reading-expert", title: "Expert lecture", desc: "Moyenne ≥ 80 % en CE (5 quiz min.)", earned: !!ce && ce.quizzesCompleted >= 5 && ce.avg >= 80 },
    { id: "first-exam", title: "Premier examen blanc", desc: "Terminer un examen blanc complet", earned: t.examsCompleted >= 1 },
    { id: "streak-7", title: "Série de 7 jours", desc: "Pratiquer 7 jours d'affilée", earned: p.streaks.longest >= 7 },
    { id: "streak-30", title: "Série de 30 jours", desc: "Pratiquer 30 jours d'affilée", earned: p.streaks.longest >= 30 },
    { id: "perfect", title: "Score parfait", desc: "Obtenir 100 % sur un quiz", earned: anyPerfect },
    { id: "marathon", title: "Marathonien", desc: "Cumuler 10 h d'étude", earned: t.studyMinutes >= 600 },
  ];
}

/* --------------------------- recommendations ----------------------------- */

function recommendations(p, bank, results) {
  const recs = [];
  const scoredSections = p.sections.filter((s) => s.avg !== null);
  const weakest = [...scoredSections].sort((a, b) => a.avg - b.avg)[0];
  const strongest = [...scoredSections].sort((a, b) => b.avg - a.avg)[0];

  if (weakest && strongest && weakest.section !== strongest.section && strongest.avg - weakest.avg >= 10) {
    recs.push({
      title: `Priorité : ${weakest.title}`,
      body: `Votre ${strongest.title.toLowerCase()} (${strongest.avg} %) est plus forte que votre ${weakest.title.toLowerCase()} (${weakest.avg} %). Pratiquez ${weakest.title.toLowerCase()} aujourd'hui.`,
      route: weakest.section === "co" ? "listening" : "reading",
      cta: `Pratiquer ${weakest.title.toLowerCase()}`,
    });
  }
  // a specific attempted quiz to redo (best attempt < 65 %)
  const weakQuiz = p.sections.map((s) => s.weakest && s.weakest.pct < 65 ? { ...s.weakest, section: s.section, sTitle: s.title } : null).filter(Boolean).sort((a, b) => a.pct - b.pct)[0];
  if (weakQuiz) {
    recs.push({
      title: `Refaites le Quizz ${weakQuiz.number} (${weakQuiz.sTitle})`,
      body: `Votre meilleur score y est de ${weakQuiz.pct} %. Le refaire est le moyen le plus rapide de progresser.`,
      route: weakQuiz.section === "co" ? "listening" : "reading",
      cta: "Ouvrir le module",
    });
  }
  // an untouched quiz in the least-explored scored section
  const unexplored = [...p.sections].filter((s) => s.bankCount > 0).sort((a, b) => a.completionPct - b.completionPct)[0];
  if (unexplored && unexplored.attemptedCount < unexplored.bankCount) {
    const attempted = new Set(results.filter((r) => r.section === unexplored.section).map((r) => r.quizKey));
    const nextNumber = bank[unexplored.section].findIndex((q) => !attempted.has(`bank-${q.id}`)) + 1;
    recs.push({
      title: `Nouveau terrain : Quizz ${nextNumber} (${unexplored.title})`,
      body: `Vous n'avez exploré que ${unexplored.completionPct} % de cette épreuve. Un quiz jamais tenté vous attend.`,
      route: unexplored.section === "co" ? "listening" : unexplored.section === "ce" ? "reading" : "practice",
      cta: "Commencer",
    });
  }
  if (p.totals.examsCompleted === 0 && p.totals.quizzesCompleted >= 3) {
    recs.push({
      title: "Prêt·e pour un examen blanc ?",
      body: "Vous avez assez pratiqué pour tenter les conditions réelles : 4 épreuves enchaînées, score sur 699.",
      route: "mocks",
      cta: "Lancer un examen blanc",
    });
  }
  return recs.slice(0, 3);
}

/* ------------------------------- insights -------------------------------- */

function insights(p, events) {
  const out = [];
  // this week vs last week average
  const monday = new Date(); monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const lastMonday = new Date(monday); lastMonday.setDate(monday.getDate() - 7);
  const avgOf = (list) => { const s = list.filter((e) => e.total > 0); return s.length ? Math.round(s.reduce((x, e) => x + e.pct, 0) / s.length) : null; };
  const thisW = avgOf(events.filter((e) => new Date(e.at) >= monday));
  const lastW = avgOf(events.filter((e) => new Date(e.at) >= lastMonday && new Date(e.at) < monday));
  if (thisW !== null && lastW !== null && thisW !== lastW) {
    out.push(thisW > lastW
      ? { tone: "up", text: `Vous performez mieux que la semaine dernière : ${lastW} % → ${thisW} % de moyenne.` }
      : { tone: "down", text: `Moyenne en légère baisse cette semaine (${lastW} % → ${thisW} %). Un quiz de plus pour remonter ?` });
  }
  if (p.xp.nextLevel && !p.xp.levelGated && p.xp.xpRemaining > 0 && p.xp.xpRemaining <= 120) {
    out.push({ tone: "up", text: `Plus que ${p.xp.xpRemaining} XP avant le niveau « ${p.xp.nextLevel} ».` });
  }
  if (p.xp.levelGated) {
    out.push({ tone: "info", text: `Le niveau « ${p.xp.nextLevel} » est à portée : l'XP y est, il ne manque que du volume et de la régularité.` });
  }
  if (p.streaks.current > 0 && !p.streaks.practicedToday) {
    out.push({ tone: "warn", text: `Votre série de ${p.streaks.current} jour${p.streaks.current > 1 ? "s" : ""} expire ce soir — un quiz suffit pour la garder vivante !` });
  }
  const scoredSections = p.sections.filter((s) => s.avg !== null);
  if (scoredSections.length >= 2) {
    const best = [...scoredSections].sort((a, b) => b.avg - a.avg)[0];
    out.push({ tone: "info", text: `${best.title} est votre point fort (${best.avg} % de moyenne).` });
  }
  return out.slice(0, 3);
}
