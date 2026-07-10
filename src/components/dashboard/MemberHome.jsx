import { useEffect, useMemo, useState } from "react";
import {
  Clock, CheckCircle2, Target, Flame, Sparkles, ArrowRight, Play,
  Zap, Trophy, ChevronDown, GraduationCap, FolderOpen, ListChecks,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, ProgressBar } from "@/components/common";
import { ProgressPanels } from "@/components/dashboard/ProgressPanels";
import { listAttempts } from "@/services/examService";
import { listQuizResults } from "@/services/quizResultsService";
import { computeProgress } from "@/services/progressService";
import { formatDuration } from "@/utils/dashboardStats";
import { ROLES } from "@/auth/rbac";

/* ------------------------------ small pieces ----------------------------- */

function StatTile({ icon: Icon, value, label, hot }) {
  const { c } = useApp();
  return (
    <Card className="p-4">
      <Icon size={18} className={hot ? "text-rose-600" : "text-blue-600"} aria-hidden="true" />
      <p className={`font-display font-extrabold text-2xl mt-2 ${c.text}`}>{value}</p>
      <p className={`text-xs ${c.faint}`}>{label}</p>
    </Card>
  );
}

function GoalRow({ label, current, target }) {
  const { c } = useApp();
  const done = current >= target;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-medium ${c.sub}`}>{label}</span>
        <span className={`font-mono2 font-semibold ${done ? "text-emerald-600" : c.text}`}>{Math.min(current, target)} / {target}{done ? " ✓" : ""}</span>
      </div>
      <ProgressBar pct={Math.min(100, (current / target) * 100)} tone={done ? "grad" : "blue"} />
    </div>
  );
}

// Streak card: the month calendar is collapsed by default (just the practiced-
// day count) and expands on click.
function StreakCard({ streaks }) {
  const { c } = useApp();
  const [open, setOpen] = useState(false);
  const cal = streaks.calendar;
  return (
    <Card className="p-6 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-rose-600/10 blur-xl" aria-hidden="true" />
      <div className="flex items-center gap-4">
        <Flame size={30} className="text-rose-600 shrink-0" />
        <div>
          <p className={`font-display font-extrabold text-3xl ${c.text}`}>{streaks.current} jour{streaks.current > 1 ? "s" : ""}</p>
          <p className={`text-xs ${c.faint}`}>série en cours · record : {streaks.longest} jour{streaks.longest > 1 ? "s" : ""}</p>
        </div>
      </div>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`mt-4 w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider ${c.faint} hover:text-blue-600`}>
        <span>{cal.monthLabel} · {cal.practiced} jour{cal.practiced > 1 ? "s" : ""} pratiqué{cal.practiced > 1 ? "s" : ""}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid grid-cols-7 gap-1.5 mt-3 rise" role="img" aria-label={`Calendrier de pratique : ${cal.practiced} jours actifs ce mois-ci`}>
          {cal.days.map((d) => (
            <span key={d.day} title={`Jour ${d.day}${d.active ? " · pratiqué" : ""}`}
              className={`aspect-square rounded-md text-[9px] font-mono2 font-bold flex items-center justify-center
              ${d.active ? "grad-brand text-white" : d.future ? `${c.faint} opacity-30` : `border ${c.border} ${c.faint}`}`}>
              {d.day}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function Skeleton() {
  const { c } = useApp();
  return (
    <div className="grid lg:grid-cols-3 gap-5" aria-busy="true" aria-label="Chargement du tableau de bord">
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
export function DashboardView({ data }) {
  const { c, nav, role } = useApp();
  const t = data.totals;
  const quickActions = [
    // Only surface a "resume" accent button for an in-progress exam; the
    // practice nudge already has its own card + the button below.
    data.continueCard?.kind === "exam" && { icon: Play, l: data.continueCard.cta, r: data.continueCard.route, variant: "accent" },
    // "Pratique gratuite" is a free-tier action; premium/admin have full access.
    role === ROLES.FREE_USER && { icon: Zap, l: "Pratique gratuite", r: "practice", variant: "accent" },
    // Distinct variants so the actions read as separate: the practice/exam
    // action is the gradient accent, the admin bank is the solid primary.
    (role === ROLES.PREMIUM_USER || role === ROLES.ADMIN) && { icon: GraduationCap, l: "Examen blanc", r: "mocks", variant: "accent" },
    role === ROLES.ADMIN && { icon: FolderOpen, l: "Banque de questions", r: "bank", variant: "primary" },
  ].filter(Boolean);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-8">
        {quickActions.map((a) => (
          <Btn key={a.l} small variant={a.variant} icon={a.icon} onClick={() => nav(a.r)}>{a.l}</Btn>
        ))}
      </div>

      {!data.hasData && (
        <Card className="p-8 mb-5 border-2 border-blue-600/40 text-center">
          <Sparkles size={28} className="text-blue-600 mx-auto" />
          <h3 className={`font-display font-bold text-xl mt-3 ${c.text}`}>Votre tableau de bord vous attend</h3>
          <p className={`text-sm mt-2 max-w-md mx-auto ${c.sub}`}>Terminez votre premier quiz et cette page se remplira : score, niveau, série d'étude, succès et recommandations personnalisées.</p>
          <Btn className="mt-5" icon={ArrowRight} onClick={() => nav("practice")}>Commencer mon premier quiz</Btn>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ---------------- left 2/3 ---------------- */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile icon={Clock} value={formatDuration(t.studyMinutes)} label="Temps d'étude" />
            <StatTile icon={CheckCircle2} value={String(t.quizzesCompleted)} label="Quiz terminés" />
            <StatTile icon={ListChecks} value={String(t.questionsAnswered)} label="Questions répondues" />
            <StatTile icon={Target} value={`${t.correctRate} %`} label="Bonnes réponses" />
          </div>

          {/* XP / level */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h3 className={`font-display font-bold ${c.text}`}>Niveau : {data.xp.level}</h3>
              <Pill tone="blue"><Zap size={12} /> {data.xp.total} XP</Pill>
            </div>
            {data.xp.nextLevel ? (
              <>
                <ProgressBar pct={(data.xp.xpIntoLevel / data.xp.xpForNext) * 100} tone="grad" />
                <p className={`text-xs mt-2 ${c.faint}`}>
                  {data.xp.levelGated
                    ? `« ${data.xp.nextLevel} » est à portée : l'XP y est, continuez à enchaîner quiz et jours de pratique pour le débloquer.`
                    : `${data.xp.xpRemaining} XP avant « ${data.xp.nextLevel} » · +10 XP par quiz, +2 XP par bonne réponse, bonus de série chaque semaine.`}
                </p>
              </>
            ) : (
              <p className={`text-sm ${c.sub}`}>Niveau maximal atteint — chapeau bas ! 🎓</p>
            )}
          </Card>

          {data.continueCard && (data.continueCard.kind === "exam" || role === ROLES.FREE_USER) && (
            <Card className="p-6 border-2 border-blue-600/40 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <Pill tone="blue"><Play size={12} /> Continuer l'apprentissage</Pill>
                <h3 className={`font-display font-bold mt-3 ${c.text}`}>{data.continueCard.title}</h3>
                <p className={`text-sm mt-1 ${c.sub}`}>{data.continueCard.detail}</p>
              </div>
              <Btn icon={ArrowRight} onClick={() => nav(data.continueCard.route)}>{data.continueCard.cta}</Btn>
            </Card>
          )}

          {/* detailed progression analytics (formerly the standalone
              "Ma progression" page, now consolidated into the dashboard) */}
          <ProgressPanels data={data} />
        </div>

        {/* ---------------- right 1/3 ---------------- */}
        <div className="space-y-5">
          <StreakCard streaks={data.streaks} />

          {/* weekly goal */}
          <Card className="p-6">
            <h3 className={`font-display font-bold mb-4 ${c.text}`}>Objectif de la semaine</h3>
            <div className="space-y-4">
              <GoalRow label="Quiz terminés" current={data.weeklyGoal.current.quizzes} target={data.weeklyGoal.targets.quizzes} />
              <GoalRow label="Jours de pratique" current={data.weeklyGoal.current.days} target={data.weeklyGoal.targets.days} />
              <GoalRow label="XP gagnés" current={data.weeklyGoal.current.xp} target={data.weeklyGoal.targets.xp} />
            </div>
          </Card>

          {/* recommendations */}
          {data.recommendations.length > 0 && (
            <Card className="p-6 border-2 border-blue-600/40">
              <Pill tone="blue"><Sparkles size={12} /> Recommandé pour vous</Pill>
              <div className="mt-4 space-y-4">
                {data.recommendations.map((r, i) => (
                  <div key={i}>
                    <p className={`font-semibold text-sm ${c.text}`}>{r.title}</p>
                    <p className={`text-sm mt-1 ${c.sub}`}>{r.body}</p>
                    <Btn small variant="ghost" className="mt-2" icon={ArrowRight} onClick={() => nav(r.route)}>{r.cta}</Btn>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* achievements */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-display font-bold ${c.text}`}>Succès</h3>
              <Pill tone="amber"><Trophy size={12} /> {data.achievements.filter((a) => a.earned).length} / {data.achievements.length}</Pill>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {data.achievements.map((a) => (
                <div key={a.id} title={a.desc} className={`p-3 rounded-2xl border ${c.border} ${a.earned ? "" : "opacity-40"}`}>
                  <Trophy size={16} className={a.earned ? "text-amber-500" : c.faint} />
                  <p className={`text-xs font-semibold mt-1.5 leading-tight ${c.text}`}>{a.title}</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${c.faint}`}>{a.desc}</p>
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

export function MemberHome({ eyebrow = "Votre espace" }) {
  const { user } = useApp();
  const [attempts, setAttempts] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    let live = true;
    listAttempts(user?.id).then(({ attempts: a }) => live && setAttempts(a));
    listQuizResults(user?.id).then(({ results: r }) => live && setResults(r));
    return () => { live = false; };
  }, [user?.id]);

  const loading = attempts === null || results === null;
  const data = useMemo(
    () => (loading ? null : computeProgress({ results, attempts })),
    [loading, results, attempts]
  );

  return (
    <PageShell wide eyebrow={eyebrow} title={`Bonjour, ${user.name} 👋`} sub="Continuez votre préparation au TCF Canada — voici où vous en êtes.">
      {loading ? <Skeleton /> : <DashboardView data={data} />}
    </PageShell>
  );
}
