import { useEffect, useMemo, useState } from "react";
import {
  Clock, CheckCircle2, Target, Flame, Sparkles, ArrowRight, Play,
  Zap, Trophy, ChevronDown, ListChecks, NotebookPen, Plane,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { PALETTE } from "@/components/home/toolsData";
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

// The site's flat colour tones (same palette as the tools and épreuves).
function useTone() {
  const { dark } = useApp();
  return (name) => {
    const [pale, ink, soft] = PALETTE[name][dark ? "dark" : "light"];
    return { pale, ink, soft, fill: PALETTE[name].light[1], edge: `${ink}55` };
  };
}

// A coloured panel: pale tone background, 2px outline in the tone.
function Panel({ tone, className = "", children }) {
  return <div className={`rounded-3xl border-2 ${className}`} style={{ background: tone.pale, borderColor: tone.edge }}>{children}</div>;
}

function Bar({ pct, tone }) {
  return (
    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: tone.soft }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: tone.fill }} />
    </div>
  );
}

function StatTile({ icon: Icon, value, label, tone }) {
  const { c } = useApp();
  return (
    <Panel tone={tone} className="p-4">
      <span className="w-9 h-9 rounded-xl text-white grid place-items-center" style={{ background: tone.fill }}><Icon size={17} aria-hidden="true" /></span>
      <p className={`font-display font-extrabold text-2xl mt-3 ${c.text}`}>{value}</p>
      <p className="text-xs font-semibold" style={{ color: tone.ink }}>{label}</p>
    </Panel>
  );
}

function GoalRow({ label, current, target, tone }) {
  const { c } = useApp();
  const done = current >= target;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className={`font-semibold ${c.sub}`}>{label}</span>
        <span className="font-mono2 font-bold" style={{ color: tone.ink }}>{Math.min(current, target)} / {target}{done ? " ✓" : ""}</span>
      </div>
      <Bar pct={(current / target) * 100} tone={tone} />
    </div>
  );
}

// The XP level as a flight: the current level at departure, the next at
// arrival, and the plane along the dashed route at the progress made.
function JourneyCard({ xp }) {
  const { c, t } = useApp();
  const tone = useTone()("blue");
  const pct = xp.nextLevel ? Math.max(4, Math.min(96, (xp.xpIntoLevel / xp.xpForNext) * 100)) : 100;
  return (
    <Panel tone={tone} className="p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 font-mono2 text-[11px] font-bold uppercase tracking-widest" style={{ color: tone.ink }}>
          <Plane size={14} /> {t("Votre parcours")}
        </span>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white inline-flex items-center gap-1" style={{ background: tone.fill }}>
          <Zap size={12} /> {xp.total} XP
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold text-white" style={{ background: tone.fill }}>{t(xp.level)}</span>
        <div className="relative flex-1 h-10" aria-hidden="true">
          <span className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed" style={{ borderColor: tone.edge }} />
          <span className="absolute left-0 top-1/2 -mt-[1px] h-[3px] rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: tone.fill }} />
          <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid place-items-center w-9 h-9 rounded-full bg-white shadow-md transition-all duration-700"
            style={{ left: `${pct}%`, color: tone.fill, boxShadow: `0 0 0 2px ${tone.fill}` }}>
            <Plane size={17} className="rotate-45" />
          </span>
        </div>
        {xp.nextLevel
          ? <span className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold border-2 border-dashed ${c.card}`} style={{ borderColor: tone.edge, color: tone.ink }}>{t(xp.nextLevel)}</span>
          : <span className="shrink-0 grid place-items-center w-9 h-9 rounded-xl text-white" style={{ background: tone.fill }}><Trophy size={17} /></span>}
      </div>
      <p className={`text-xs mt-4 ${c.sub}`}>
        {!xp.nextLevel
          ? t("Niveau maximal atteint — chapeau bas ! 🎓")
          : xp.levelGated
            ? `« ${t(xp.nextLevel)} » ${t("est à portée : l'XP y est, continuez à enchaîner quiz et jours de pratique pour le débloquer.")}`
            : `${xp.xpRemaining} ${t("XP avant")} « ${t(xp.nextLevel)} » ${t("· +10 XP par quiz, +2 XP par bonne réponse, bonus de série chaque semaine.")}`}
      </p>
    </Panel>
  );
}

// Streak card: compact by default (streak count + month summary); hovering the
// card expands it to reveal a plain-language explanation, the month calendar
// and a colour legend so the whole thing is self-explanatory.
function StreakCard({ streaks }) {
  const { c, t } = useApp();
  const tone = useTone()("rose");
  const cal = streaks.calendar;
  const today = new Date().getDate();
  return (
    <Panel tone={tone} className="group p-6">
      <div className="flex items-center gap-4">
        <span className="w-12 h-12 rounded-2xl text-white grid place-items-center shrink-0" style={{ background: tone.fill }}><Flame size={24} /></span>
        <div>
          <p className={`font-display font-extrabold text-3xl ${c.text}`}>{streaks.current} {t(streaks.current > 1 ? "jours" : "jour")}</p>
          <p className={`text-xs ${c.sub}`}>{t("série en cours · record :")} {streaks.longest} {t(streaks.longest > 1 ? "jours" : "jour")}</p>
        </div>
      </div>

      {/* Hover affordance: month summary. Hovering the card reveals the detail. */}
      <div className="mt-4 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: tone.ink }}>
        <span>{t(cal.monthLabel)} · {cal.practiced} {t(cal.practiced > 1 ? "jours pratiqués" : "jour pratiqué")}</span>
        <ChevronDown size={14} className="shrink-0 transition-transform group-hover:rotate-180" />
      </div>

      {/* Revealed on hover: explanation, calendar and colour legend. */}
      <div className="max-h-0 opacity-0 overflow-hidden transition-all duration-300 group-hover:max-h-[460px] group-hover:opacity-100 group-hover:mt-3">
        <p className={`text-xs leading-relaxed ${c.sub}`}>
          {t("Votre série, c'est le nombre de jours d'affilée où vous avez pratiqué. Faites au moins un quiz chaque jour pour la faire grandir : un seul jour manqué la remet à zéro.")}
        </p>
        {!streaks.practicedToday && (
          <p className="text-xs leading-relaxed mt-2 font-medium" style={{ color: tone.ink }}>
            {t(streaks.current > 0 ? "Vous n'avez pas encore pratiqué aujourd'hui : un quiz suffit pour garder votre série." : "Pratiquez aujourd'hui pour démarrer une nouvelle série.")}
          </p>
        )}
        <div className="grid grid-cols-7 gap-1.5 mt-3" role="img" aria-label={`${t("Calendrier de pratique :")} ${cal.practiced} ${t(cal.practiced > 1 ? "jours actifs ce mois-ci" : "jour actif ce mois-ci")}`}>
          {cal.days.map((d) => {
            const isToday = d.day === today;
            const style = d.active ? { background: tone.fill, color: "#FFFFFF" } : undefined;
            const cls = d.active ? "" : d.future ? `${c.faint} opacity-30` : `border ${c.border} ${c.card} ${isToday ? "text-blue-600" : c.faint}`;
            return (
              <span key={d.day} title={`${t("Jour")} ${d.day}${d.active ? ` · ${t("pratiqué")}` : isToday ? ` · ${t("aujourd'hui")}` : ""}`}
                className={`aspect-square rounded-md text-[11px] font-mono2 font-extrabold flex items-center justify-center ${cls} ${isToday ? "ring-2 ring-blue-500" : ""}`} style={style}>
                {d.day}
              </span>
            );
          })}
        </div>
        {/* Colour legend so the calendar is self-explanatory. */}
        <div className={`flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[10px] ${c.faint}`}>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ background: tone.fill }} aria-hidden="true" /> {t("Pratiqué")}</span>
          <span className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded border ${c.border} ${c.card} inline-block`} aria-hidden="true" /> {t("Non pratiqué")}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-blue-500 inline-block" aria-hidden="true" /> {t("Aujourd'hui")}</span>
          <span className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded border ${c.border} opacity-30 inline-block`} aria-hidden="true" /> {t("À venir")}</span>
        </div>
      </div>
    </Panel>
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
// any dataset, and reused by the Dashboard route. Styled like the rest of the
// site: flat colour tones with clear outlines, the XP level as a flight route.
export function DashboardView({ data, toReview = 0 }) {
  const { c, nav, role, t } = useApp();
  const tone = useTone();
  const tot = data.totals;
  const blue = tone("blue");
  const amber = tone("amber");
  const earned = data.achievements.filter((a) => a.earned).length;

  return (
    <>
      {!data.hasData && (
        <Panel tone={blue} className="p-8 mb-5 text-center">
          <span className="w-12 h-12 rounded-2xl text-white grid place-items-center mx-auto" style={{ background: blue.fill }}><Sparkles size={22} /></span>
          <h3 className={`font-display font-bold text-xl mt-3 ${c.text}`}>{t("Votre tableau de bord vous attend")}</h3>
          <p className={`text-sm mt-2 max-w-md mx-auto ${c.sub}`}>{t("Terminez votre premier quiz et cette page se remplira : score, niveau, série d'étude, succès et recommandations personnalisées.")}</p>
          <Btn className="mt-5" icon={ArrowRight} onClick={() => nav("practice")}>{t("Commencer mon premier quiz")}</Btn>
        </Panel>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ---------------- left 2/3 ---------------- */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile icon={Clock} value={formatDuration(tot.studyMinutes)} label={t("Temps d'étude")} tone={tone("blue")} />
            <StatTile icon={CheckCircle2} value={String(tot.quizzesCompleted)} label={t("Quiz terminés")} tone={tone("mint")} />
            <StatTile icon={ListChecks} value={String(tot.questionsAnswered)} label={t("Questions répondues")} tone={tone("violet")} />
            <StatTile icon={Target} value={`${tot.correctRate} %`} label={t("Bonnes réponses")} tone={tone("amber")} />
          </div>

          <JourneyCard xp={data.xp} />

          {data.continueCard && (data.continueCard.kind === "exam" || role === ROLES.FREE_USER) && (
            <div className="rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center gap-4 text-white" style={{ background: blue.fill }}>
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/20"><Play size={12} /> {t("Continuer l'apprentissage")}</span>
                <h3 className="font-display font-bold mt-3">{t(data.continueCard.title)}</h3>
                <p className="text-sm mt-1 text-white/80">{t(data.continueCard.detail)}</p>
              </div>
              <button type="button" onClick={() => nav(data.continueCard.route)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white font-semibold text-sm transition hover:gap-3" style={{ color: blue.fill }}>
                {t(data.continueCard.cta)} <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* detailed progression analytics (formerly the standalone
              "Ma progression" page, now consolidated into the dashboard) */}
          <ProgressPanels data={data} />
        </div>

        {/* ---------------- right 1/3 ---------------- */}
        <div className="space-y-5">
          {toReview > 0 && canUseNotebook(role) && (
            <Panel tone={amber} className="p-6">
              <div className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-2xl text-white grid place-items-center shrink-0" style={{ background: amber.fill }}><NotebookPen size={22} aria-hidden="true" /></span>
                <div>
                  <p className={`font-display font-extrabold text-2xl ${c.text}`}>{toReview} {t(toReview > 1 ? "questions" : "question")}</p>
                  <p className="text-xs font-semibold" style={{ color: amber.ink }}>{t("à revoir dans votre carnet d'erreurs")}</p>
                </div>
              </div>
              <Btn small className="mt-4" icon={ArrowRight} onClick={() => nav("carnet")} style={{ background: amber.fill }}>{t("Revoir mes erreurs")}</Btn>
            </Panel>
          )}

          <StreakCard streaks={data.streaks} />

          {/* weekly goal */}
          <Card className="p-6 border-2">
            <h3 className={`font-display font-bold mb-4 ${c.text}`}>{t("Objectif de la semaine")}</h3>
            <div className="space-y-4">
              <GoalRow label={t("Quiz terminés")} current={data.weeklyGoal.current.quizzes} target={data.weeklyGoal.targets.quizzes} tone={tone("mint")} />
              <GoalRow label={t("Jours de pratique")} current={data.weeklyGoal.current.days} target={data.weeklyGoal.targets.days} tone={tone("rose")} />
              <GoalRow label={t("XP gagnés")} current={data.weeklyGoal.current.xp} target={data.weeklyGoal.targets.xp} tone={tone("blue")} />
            </div>
          </Card>

          {/* recommendations */}
          {data.recommendations.length > 0 && (
            <Panel tone={tone("violet")} className="p-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: tone("violet").fill }}>
                <Sparkles size={12} /> {t("Recommandé pour vous")}
              </span>
              <div className="mt-4 space-y-3">
                {data.recommendations.map((r, i) => (
                  <div key={i} className={`p-4 rounded-2xl border ${c.border} ${c.card}`}>
                    <p className={`font-semibold text-sm ${c.text}`}>{t(r.title)}</p>
                    <p className={`text-sm mt-1 ${c.sub}`}>{t(r.body)}</p>
                    <Btn small variant="ghost" className="mt-2" icon={ArrowRight} onClick={() => nav(r.route)}>{t(r.cta)}</Btn>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* achievements, as badges: gold when earned, greyed otherwise */}
          <Card className="p-6 border-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-display font-bold ${c.text}`}>{t("Succès")}</h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white inline-flex items-center gap-1" style={{ background: amber.fill }}>
                <Trophy size={12} /> {earned} / {data.achievements.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {data.achievements.map((a) => (
                <div key={a.id} title={t(a.desc)}
                  className={`p-3 rounded-2xl border-2 ${a.earned ? "" : `border-dashed ${c.border} opacity-50`}`}
                  style={a.earned ? { background: amber.pale, borderColor: amber.edge } : undefined}>
                  <span className={`w-7 h-7 rounded-lg grid place-items-center ${a.earned ? "text-white" : c.faint}`} style={a.earned ? { background: amber.fill } : undefined}>
                    <Trophy size={14} />
                  </span>
                  <p className={`text-xs font-semibold mt-1.5 leading-tight ${c.text}`}>{t(a.title)}</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${c.faint}`}>{t(a.desc)}</p>
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
