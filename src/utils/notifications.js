import { Trophy, Zap, Flame, Target } from "lucide-react";

// Turns the computed dashboard progress (progressService.computeProgress) into
// the list of notifications shown in the nav bell. Every entry is derived from
// the user's real history — no seed content — so the bell reflects what the
// member has actually accomplished: achievements unlocked, weekly objectives
// met, a new level reached, or a streak about to lapse.
//
// Each fact carries a *stable* id so useNotifications can track its
// read/dismissed state and its first-seen time across sessions. Ids are built
// so a milestone never re-fires once earned (achievements, levels are
// monotonic), while time-boxed nudges rotate on their own:
//   - weekly-goal ids embed the current week → last week's celebration drops
//     off automatically when a new week starts;
//   - the streak-at-risk id embeds today's date → it reappears each day the
//     user hasn't practised yet, and clears the moment they do.

const dateKey = (d) => new Date(d).toLocaleDateString("en-CA"); // YYYY-MM-DD

function currentMonday() {
  const m = new Date();
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); // Monday-based, matches progressService
  return m;
}

export function deriveNotifications(progress) {
  if (!progress || !progress.hasData) return [];
  const { xp, streaks, weeklyGoal, achievements } = progress;
  const out = [];

  // Streak about to lapse — the one time-sensitive, actionable nudge.
  if (streaks.current > 0 && !streaks.practicedToday) {
    out.push({
      id: `streak-risk-${dateKey(new Date())}`,
      icon: Flame,
      t: `Votre série de ${streaks.current} jour${streaks.current > 1 ? "s" : ""} expire ce soir — un quiz suffit pour la garder ! ⏳`,
    });
  }

  // A new level reached (anything above the entry level "Débutant").
  if (xp.levelIdx >= 1) {
    out.push({
      id: `level-${xp.levelIdx}`,
      icon: Zap,
      t: `Niveau atteint : « ${xp.level} » ! Vous cumulez ${xp.total} XP.`,
    });
  }

  // Weekly objectives met (this week only — the week id retires past weeks).
  const wk = dateKey(currentMonday());
  const { current, targets } = weeklyGoal;
  if (current.quizzes >= targets.quizzes)
    out.push({ id: `goal-quizzes-${wk}`, icon: Target, t: `Objectif de la semaine atteint : ${targets.quizzes} quiz terminés cette semaine ! 🎯` });
  if (current.days >= targets.days)
    out.push({ id: `goal-days-${wk}`, icon: Target, t: `Objectif de la semaine atteint : ${targets.days} jours de pratique cette semaine ! 🎯` });
  if (current.xp >= targets.xp)
    out.push({ id: `goal-xp-${wk}`, icon: Target, t: `Objectif de la semaine atteint : ${targets.xp} XP gagnés cette semaine ! 🎯` });

  // Achievements unlocked (streak/exam/volume milestones live here already, so
  // there's no separate streak-milestone entry — it would double up).
  for (const a of achievements) {
    if (a.earned) out.push({ id: `ach-${a.id}`, icon: Trophy, t: `Succès débloqué : « ${a.title} » — ${a.desc}.` });
  }

  return out;
}

// Relative "il y a…" label from an ISO timestamp. French source; en.js
// translates the handful of shapes this produces.
export function timeAgo(iso, now = Date.now()) {
  const min = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} jours`;
  return `il y a ${Math.floor(d / 7)} sem.`;
}
