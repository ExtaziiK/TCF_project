import { useEffect, useMemo, useState } from "react";
import {
  Clock, CheckCircle2, Target, Flame, Sparkles, ArrowRight, Play, Trophy, ChevronDown, ListChecks, NotebookPen, Plane, Check,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { DzRequestStatus } from "@/components/dashboard/DzRequestStatus";
import { ProgressPanels } from "@/components/dashboard/ProgressPanels";
import { listAttempts } from "@/services/examService";
import { listQuizResults } from "@/services/quizResultsService";
import { listDicteeSessions } from "@/services/dicteeService";
import { computeProgress } from "@/services/progressService";
import { listMistakes, bankQuestionIndex, ownContentCardOk } from "@/services/mistakeNotebookService";
import { formatDuration } from "@/utils/dashboardStats";
import { ROLES, canUseNotebook } from "@/auth/rbac";

/* ------------------------------ small pieces ----------------------------- */

// The dashboard keeps white cards and slate text, with colour in small,
// meaningful touches (an icon, a ring, a medal) rather than coloured tiles.
// Each kind of data gets its own plain visual form — a summary strip, a route
// line, a to-do list, a week of dots, progress rings, round medals.
const ACCENT = "#2563EB";
const GOLD = "#F59E0B";

function CardTitle({ children, aside }) {
  const { c } = useApp();
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className={`text-xs font-bold uppercase tracking-widest ${c.faint}`}>{children}</h3>
      {aside}
    </div>
  );
}

// Four figures side by side, split by hairlines.
function SummaryStrip({ items }) {
  const { c } = useApp();
  return (
    <Card className="grid grid-cols-2 md:grid-cols-4">
      {items.map(({ icon: Icon, value, label, color }, i) => (
        <div key={label} className={`p-5 ${i % 2 ? `border-l ${c.border}` : ""} ${i >= 2 ? `border-t md:border-t-0 ${c.border}` : ""} ${i === 2 ? `md:border-l` : ""}`}>
          <p className={`flex items-center gap-2 text-xs font-semibold ${c.faint}`}>
            <span className="w-6 h-6 rounded-lg grid place-items-center" style={{ background: `${color}1A`, color }}><Icon size={13} aria-hidden="true" /></span> {label}
          </p>
          <p className={`font-display font-extrabold text-3xl mt-2 tabular-nums ${c.text}`}>{value}</p>
        </div>
      ))}
    </Card>
  );
}

// The XP level as a thin route: current level, the plane at the progress
// made, the next level.
function Journey({ xp }) {
  const { c, t } = useApp();
  const pct = xp.nextLevel ? Math.max(3, Math.min(97, (xp.xpIntoLevel / xp.xpForNext) * 100)) : 100;
  return (
    <Card className="p-6">
      <CardTitle aside={<span className={`text-xs font-mono2 font-semibold ${c.sub}`}>{xp.total} XP</span>}>{t("Votre parcours")}</CardTitle>
      <div className="flex items-center gap-4">
        <span className={`shrink-0 font-display font-bold ${c.text}`}>{t(xp.level)}</span>
        <div className="relative flex-1 h-8" aria-hidden="true">
          <span className={`absolute inset-x-0 top-1/2 h-[2px] -mt-px rounded-full ${c.track}`} />
          <span className="absolute left-0 top-1/2 h-[2px] -mt-px rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: ACCENT }} />
          <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700" style={{ left: `${pct}%`, color: ACCENT }}>
            <Plane size={18} className="rotate-45" />
          </span>
        </div>
        <span className={`shrink-0 font-display font-bold ${c.faint}`}>{xp.nextLevel ? t(xp.nextLevel) : <Trophy size={18} />}</span>
      </div>
      <p className={`text-xs mt-3 ${c.faint}`}>
        {!xp.nextLevel
          ? t("Niveau maximal atteint — chapeau bas ! 🎓")
          : xp.levelGated
            ? `« ${t(xp.nextLevel)} » ${t("est à portée : l'XP y est, continuez à enchaîner quiz et jours de pratique pour le débloquer.")}`
            : `${xp.xpRemaining} ${t("XP avant")} « ${t(xp.nextLevel)} » ${t("· +10 XP par quiz, +2 XP par bonne réponse, bonus de série chaque semaine.")}`}
      </p>
    </Card>
  );
}

// « À faire aujourd'hui »: the next steps as one checklist rather than a
// stack of separate cards.
function TodoList({ items }) {
  const { c, t, nav } = useApp();
  if (!items.length) return null;
  return (
    <Card className="p-6">
      <CardTitle>{t("À faire aujourd'hui")}</CardTitle>
      <ul className={`divide-y ${dividers(c)}`}>
        {items.map((it, i) => (
          <li key={i}>
            <button type="button" onClick={() => nav(it.route)} className="group w-full flex items-center gap-4 py-3.5 text-left">
              <span className="w-9 h-9 rounded-full grid place-items-center shrink-0" style={{ background: `${it.color}1A`, color: it.color }}><it.icon size={16} aria-hidden="true" /></span>
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-semibold ${c.text}`}>{it.title}</span>
                {it.detail && <span className={`block text-xs mt-0.5 ${c.faint}`}>{it.detail}</span>}
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold transition-all group-hover:gap-2" style={{ color: ACCENT }}>
                {it.cta} <ArrowRight size={14} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
const dividers = (c) => (c.border.includes("800") ? "divide-slate-800" : "divide-slate-200");

// Streak: the count, the last seven days as dots, and — on hover — the month
// calendar with a plain-language explanation.
function StreakCard({ streaks }) {
  const { c, t } = useApp();
  const cal = streaks.calendar;
  const today = new Date().getDate();
  const week = cal.days.slice(Math.max(0, today - 7), today);
  return (
    <Card className="group p-6">
      <CardTitle aside={<Flame size={18} className={streaks.practicedToday ? "text-orange-500" : "text-orange-300"} aria-hidden="true" />}>{t("Série")}</CardTitle>
      <p className={`font-display font-extrabold text-4xl tabular-nums ${c.text}`}>
        {streaks.current} <span className={`text-base font-bold ${c.faint}`}>{t(streaks.current > 1 ? "jours" : "jour")}</span>
      </p>
      <p className={`text-xs mt-1 ${c.faint}`}>{t("record :")} {streaks.longest} {t(streaks.longest > 1 ? "jours" : "jour")}</p>

      {/* The last seven days. */}
      <div className="mt-4 flex justify-between" aria-label={t("Les sept derniers jours")}>
        {week.map((d) => {
          const isToday = d.day === today;
          return (
            <span key={d.day} className="flex flex-col items-center gap-1.5">
              <span className={`w-6 h-6 rounded-full ${d.active ? "" : `border-2 ${c.border}`}`}
                style={d.active ? { background: ACCENT } : isToday ? { borderColor: ACCENT } : undefined} />
              <span className={`text-[10px] font-mono2 ${isToday ? "font-bold" : ""} ${c.faint}`}>{d.day}</span>
            </span>
          );
        })}
      </div>

      {/* Hover: the month, and what a streak is. */}
      <div className={`mt-4 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider ${c.faint}`}>
        <span>{t(cal.monthLabel)} · {cal.practiced} {t(cal.practiced > 1 ? "jours pratiqués" : "jour pratiqué")}</span>
        <ChevronDown size={14} className="shrink-0 transition-transform group-hover:rotate-180" />
      </div>
      <div className="max-h-0 opacity-0 overflow-hidden transition-all duration-300 group-hover:max-h-[460px] group-hover:opacity-100 group-hover:mt-3">
        <p className={`text-xs leading-relaxed ${c.sub}`}>
          {t("Votre série, c'est le nombre de jours d'affilée où vous avez pratiqué. Faites au moins un quiz chaque jour pour la faire grandir : un seul jour manqué la remet à zéro.")}
        </p>
        {!streaks.practicedToday && (
          <p className={`text-xs leading-relaxed mt-2 font-medium ${c.text}`}>
            {t(streaks.current > 0 ? "Vous n'avez pas encore pratiqué aujourd'hui : un quiz suffit pour garder votre série." : "Pratiquez aujourd'hui pour démarrer une nouvelle série.")}
          </p>
        )}
        <div className="grid grid-cols-7 gap-1.5 mt-3" role="img" aria-label={`${t("Calendrier de pratique :")} ${cal.practiced} ${t(cal.practiced > 1 ? "jours actifs ce mois-ci" : "jour actif ce mois-ci")}`}>
          {cal.days.map((d) => (
            <span key={d.day} title={`${t("Jour")} ${d.day}${d.active ? ` · ${t("pratiqué")}` : ""}`}
              className={`aspect-square rounded-md text-[10px] font-mono2 font-bold flex items-center justify-center ${d.active ? "text-white" : d.future ? `${c.faint} opacity-30` : `border ${c.border} ${c.faint}`}`}
              style={d.active ? { background: ACCENT } : d.day === today ? { boxShadow: `0 0 0 2px ${ACCENT}` } : undefined}>
              {d.day}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

// A small progress ring for one weekly goal.
function Ring({ label, current, target, color }) {
  const { c } = useApp();
  const R = 26;
  const CIRC = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, current / target));
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90" aria-hidden="true">
          <circle cx="32" cy="32" r={R} fill="none" stroke="currentColor" strokeWidth="5" className={c.border.includes("800") ? "text-slate-800" : "text-slate-200"} />
          <circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - frac)} style={{ transition: "stroke-dashoffset .6s ease" }} />
        </svg>
        <span className={`absolute inset-0 grid place-items-center text-xs font-mono2 font-bold ${c.text}`}>
          {frac >= 1 ? <Check size={16} style={{ color }} /> : `${Math.min(current, target)}/${target}`}
        </span>
      </div>
      <span className={`mt-2 text-[11px] font-semibold leading-tight ${c.sub}`}>{label}</span>
    </div>
  );
}

function Skeleton() {
  const { c, t } = useApp();
  return (
    <div className="grid lg:grid-cols-3 gap-5" aria-busy="true" aria-label={t("Chargement du tableau de bord")}>
      {[...Array(6)].map((_, i) => (
        <Card key={i} className={`p-6 animate-pulse ${i < 2 ? "lg:col-span-2" : ""}`}>
          <div className={`h-4 w-1/3 rounded-full ${c.track}`} />
          <div className={`h-3 w-2/3 rounded-full mt-3 ${c.track}`} />
          <div className={`h-24 rounded-2xl mt-4 ${c.track}`} />
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------ main view -------------------------------- */

// Presentational: everything comes from the precomputed `data`
// (progressService.computeProgress) so it can be rendered and tested with
// any dataset, and reused by the Dashboard route.
export function DashboardView({ data, toReview = 0 }) {
  const { c, nav, role, t } = useApp();
  const tot = data.totals;
  const earned = data.achievements.filter((a) => a.earned).length;

  // The checklist: resume an exam (or the free account's next step), the
  // carnet's backlog, then the personal recommendations.
  const todo = [
    ...(data.continueCard && (data.continueCard.kind === "exam" || role === ROLES.FREE_USER)
      ? [{ icon: Play, color: "#2563EB", title: t(data.continueCard.title), detail: t(data.continueCard.detail), cta: t(data.continueCard.cta), route: data.continueCard.route }] : []),
    ...(toReview > 0 && canUseNotebook(role)
      ? [{ icon: NotebookPen, color: "#C9821A", title: `${toReview} ${t(toReview > 1 ? "questions" : "question")} ${t("à revoir dans votre carnet d'erreurs")}`, cta: t("Revoir"), route: "carnet" }] : []),
    ...data.recommendations.map((r) => ({ icon: Sparkles, color: "#7C3AED", title: t(r.title), detail: t(r.body), cta: t(r.cta), route: r.route })),
  ];

  return (
    <>
      {!data.hasData && (
        <Card className="p-8 mb-5 text-center">
          <Sparkles size={24} className="mx-auto" style={{ color: ACCENT }} />
          <h3 className={`font-display font-bold text-xl mt-3 ${c.text}`}>{t("Votre tableau de bord vous attend")}</h3>
          <p className={`text-sm mt-2 max-w-md mx-auto ${c.sub}`}>{t("Terminez votre premier quiz et cette page se remplira : score, niveau, série d'étude, succès et recommandations personnalisées.")}</p>
          <Btn className="mt-5" icon={ArrowRight} onClick={() => nav("practice")}>{t("Commencer mon premier quiz")}</Btn>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ---------------- main column ---------------- */}
        <div className="lg:col-span-2 space-y-5">
          <SummaryStrip items={[
            { icon: Clock, value: formatDuration(tot.studyMinutes), label: t("Temps d'étude"), color: "#0D9488" },
            { icon: CheckCircle2, value: String(tot.quizzesCompleted), label: t("Quiz terminés"), color: "#2563EB" },
            { icon: ListChecks, value: String(tot.questionsAnswered), label: t("Questions répondues"), color: "#7C3AED" },
            { icon: Target, value: `${tot.correctRate} %`, label: t("Bonnes réponses"), color: "#059669" },
          ]} />

          <Journey xp={data.xp} />

          <TodoList items={todo} />

          {/* detailed progression analytics (formerly the standalone
              "Ma progression" page, now consolidated into the dashboard) */}
          <ProgressPanels data={data} />
        </div>

        {/* ---------------- side column ---------------- */}
        <div className="space-y-5">
          <StreakCard streaks={data.streaks} />

          <Card className="p-6">
            <CardTitle>{t("Objectif de la semaine")}</CardTitle>
            <div className="grid grid-cols-3 gap-2">
              <Ring label={t("Quiz terminés")} current={data.weeklyGoal.current.quizzes} target={data.weeklyGoal.targets.quizzes} color="#2563EB" />
              <Ring label={t("Jours de pratique")} current={data.weeklyGoal.current.days} target={data.weeklyGoal.targets.days} color="#E11D48" />
              <Ring label={t("XP gagnés")} current={data.weeklyGoal.current.xp} target={data.weeklyGoal.targets.xp} color="#7C3AED" />
            </div>
          </Card>

          {/* achievements: round medals, details on hover */}
          <Card className="p-6">
            <CardTitle aside={<span className={`text-xs font-mono2 font-semibold ${c.sub}`}>{earned} / {data.achievements.length}</span>}>{t("Succès")}</CardTitle>
            <div className="grid grid-cols-4 gap-3">
              {data.achievements.map((a) => (
                <div key={a.id} className="group relative flex flex-col items-center">
                  <span className={`w-11 h-11 rounded-full grid place-items-center ${a.earned ? "text-white" : `border-2 border-dashed ${c.border} ${c.faint}`}`}
                    style={a.earned ? { background: GOLD, boxShadow: `0 0 0 3px ${GOLD}33` } : undefined} aria-label={`${t(a.title)} — ${t(a.desc)}`}>
                    <Trophy size={17} />
                  </span>
                  <span className={`mt-1.5 text-[10px] font-semibold text-center leading-tight line-clamp-2 ${a.earned ? c.text : c.faint}`}>{t(a.title)}</span>
                  <span role="tooltip" className="pointer-events-none absolute bottom-full mb-2 w-44 rounded-xl bg-slate-900 text-white text-[11px] leading-snug px-3 py-2 shadow-xl opacity-0 group-hover:opacity-100 transition z-20">
                    {t(a.desc)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ------------------------- data-fetching wrapper ------------------------- */

// One caller since the logged-in "/" was merged into the dashboard route, so
// the eyebrow is no longer a prop: the page has one name, and this is it.
export function MemberHome() {
  const { user, t, role } = useApp();
  const [attempts, setAttempts] = useState(null);
  const [results, setResults] = useState(null);
  const [dictees, setDictees] = useState(null);
  const [toReview, setToReview] = useState(0);

  useEffect(() => {
    let live = true;
    listAttempts(user?.id).then(({ attempts: a }) => live && setAttempts(a));
    listQuizResults(user?.id).then(({ results: r }) => live && setResults(r));
    listDicteeSessions(user?.id).then(({ sessions: s }) => live && setDictees(s));
    // Counted against the bank, like the notebook page, so a card whose
    // question has left the bank never inflates the number.
    if (canUseNotebook(role)) listMistakes().then(({ cards }) => {
      if (!live) return;
      const index = bankQuestionIndex();
      setToReview(cards.filter((x) => x.status === "to_review" && (index.has(x.questionId) || ownContentCardOk(x))).length);
    });
    return () => { live = false; };
  }, [user?.id, role]);

  const loading = attempts === null || results === null || dictees === null;
  const data = useMemo(
    () => (loading ? null : computeProgress({ results, attempts, dictees })),
    [loading, results, attempts, dictees]
  );

  return (
    <PageShell wide eyebrow={t("Tableau de bord")} title={`${t("Bonjour,")} ${user.name} 👋`} sub={t("Continuez votre préparation au TCF Canada — voici où vous en êtes.")}>
      <DzRequestStatus />
      {loading ? <Skeleton /> : <DashboardView data={data} toReview={toReview} />}
    </PageShell>
  );
}
