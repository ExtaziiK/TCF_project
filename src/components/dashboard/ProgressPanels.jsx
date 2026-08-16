import { GraduationCap, BookOpen, Repeat2 } from "lucide-react";
import { RouteLink } from "@/components/common";
import { useApp } from "@/context/AppContext";
import { Card, Pill, ProgressBar } from "@/components/common";
import { ScoreSparkline } from "@/components/dashboard/charts";
import { formatDuration } from "@/utils/dashboardStats";

// Detailed progression analytics, computed from progressService and rendered
// inside the member dashboard (MemberHome): weekly study time, score trend,
// per-épreuve accuracy (EE/EO are self-assessed, not auto-graded), and the
// full session history. All values come from the user's real Supabase data.
export function ProgressPanels({ data }) {
  const { c, lang, t } = useApp();
  const maxMin = Math.max(1, ...data.week.days.map((d) => d.minutes));
  // Weekday initials come from the service in French (L M M J V S D).
  const dayInitial = (label, i) => (lang === "en" ? ["M", "T", "W", "T", "F", "S", "S"][i] : label);
  const todayIdx = (new Date().getDay() + 6) % 7; // service weeks are Monday-first
  const LANE = 150; // px height of each day's track

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      {/* study time this week */}
      <Card className="p-6">
        <h3 className={`font-display font-bold mb-1 ${c.text}`}>{t("Temps d'étude cette semaine")}</h3>
        <p className={`text-sm ${c.faint} mb-6`}>{formatDuration(data.week.minutes)} {t("au total ·")} {data.week.activeDays} {t(data.week.activeDays > 1 ? "jours actifs" : "jour actif")}</p>
        {/* Each day is a rounded "lane" (track) with a gradient fill growing
            from the bottom and its value floating just above — so empty days
            read as intentional rather than as a stray nub. Heights are pixel
            values against a fixed budget: a percentage height would collapse,
            since the row's height isn't definite. */}
        <div className="flex items-end gap-2 sm:gap-3" style={{ height: LANE + 26 }} role="img" aria-label={t("Minutes d'étude par jour")}>
          {data.week.days.map((d, i) => {
            const active = d.minutes > 0;
            const fillPx = active ? Math.max(12, Math.round((d.minutes / maxMin) * LANE)) : 0;
            const isToday = i === todayIdx;
            return (
              <div key={i} className="group relative flex-1 h-full" aria-label={`${dayInitial(d.label, i)} · ${d.minutes} min · ${d.count} ${t(d.count > 1 ? "activités" : "activité")}`}>
                {/* hover summary (concise) */}
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] leading-tight whitespace-nowrap shadow-xl shadow-slate-900/25 text-center">
                    <p className="font-bold">{active ? `${d.minutes} min` : t("Pas d'activité")}</p>
                    <p className="opacity-80">{active ? `${d.count} ${t(d.count > 1 ? "activités" : "activité")}` : "—"}</p>
                  </div>
                  <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 w-2.5 h-2.5 bg-slate-900 rotate-45" aria-hidden="true" />
                </div>
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[26px] sm:w-[30px] rounded-xl ${c.track} ${isToday ? "ring-2 ring-blue-500/30" : ""}`} style={{ height: LANE }} />
                {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[26px] sm:w-[30px] rounded-xl shadow-md shadow-rose-600/20 brightness-90 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-rose-600/35 group-hover:brightness-100" style={{ height: fillPx, background: "linear-gradient(180deg,#2E6BE6 0%,#6C4FE0 55%,#D8354A 100%)" }} />}
                {active && <span className={`absolute left-1/2 -translate-x-1/2 text-[11px] font-mono2 font-bold whitespace-nowrap ${c.sub}`} style={{ bottom: fillPx + 6 }}>{d.minutes}&apos;</span>}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 sm:gap-3 mt-3">
          {data.week.days.map((d, i) => (
            <span key={i} className="flex-1 flex justify-center">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === todayIdx ? "grad-brand text-white shadow-sm shadow-blue-600/30" : c.sub}`}>{dayInitial(d.label, i)}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* score evolution */}
      <Card className="p-6 flex flex-col">
        <h3 className={`font-display font-bold mb-1 ${c.text}`}>{t("Évolution du score")}</h3>
        <p className={`text-sm ${c.faint} mb-6`}>{t("Vos sessions notées les plus récentes (compréhension orale et écrite, TCF blancs).")}</p>
        <div className="flex-1 flex items-center">
          <ScoreSparkline series={data.charts.scoreSeries} height={150} />
        </div>
      </Card>

      {/* per section */}
      <Card className="p-6">
        <h3 className={`font-display font-bold mb-5 ${c.text}`}>{t("Par épreuve")}</h3>
        <div className="space-y-5">
          {data.sections.map((s) => {
            const selfAssessed = s.section === "ee" || s.section === "eo";
            return (
              <div key={s.section}>
                <div className="flex justify-between items-center text-sm mb-1.5">
                  <span className={`font-medium ${c.text}`}>{t(s.title)}</span>
                  {s.avg !== null ? (
                    <span className={`font-mono2 font-semibold ${c.sub}`}>{s.avg} %{s.cefr ? ` · ${s.cefr}` : ""}</span>
                  ) : (
                    <Pill tone="slate">{t(selfAssessed ? "Auto-évaluée" : s.bankCount > 0 ? "Non tentée" : "Bientôt")}</Pill>
                  )}
                </div>
                {s.avg !== null ? (
                  <ProgressBar pct={s.avg} tone="grad" />
                ) : (
                  <p className={`text-xs ${c.faint}`}>
                    {selfAssessed
                      ? t("Épreuve d'expression : travaillée dans l'atelier, non notée automatiquement.")
                      : s.bankCount > 0 ? `${s.bankCount} ${t("quiz disponibles — aucun tenté pour l'instant.")}` : t("Les quiz de cette épreuve arrivent bientôt.")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* conjugation — its own panel rather than a row in "Par épreuve",
          because a drill on the subjonctif is not an épreuve and is
          deliberately kept out of the averages above (see progressService). */}
      <ConjugationPanel data={data.conjugation} />

      {/* history */}
      <Card className="p-6">
        <h3 className={`font-display font-bold mb-4 ${c.text}`}>{t("Historique des sessions")}</h3>
        {data.sessions.length === 0 ? (
          <p className={`text-sm py-6 text-center ${c.faint}`}>{t("Aucune session terminée pour l'instant.")}</p>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-left text-xs uppercase tracking-wider ${c.faint}`}><th className="pb-3 pr-4 font-semibold">{t("Activité")}</th><th className="pb-3 pr-4 font-semibold">Date</th><th className="pb-3 pr-4 font-semibold">{t("Durée")}</th><th className="pb-3 font-semibold">{t("Résultat")}</th></tr></thead>
              <tbody>
                {data.sessions.map((h, i) => (
                  <tr key={i} className={`border-t ${c.border}`}>
                    <td className={`py-3 pr-4 font-medium ${c.text}`}>
                      <span className="inline-flex items-center gap-2">
                        {h.kind === "exam" ? <GraduationCap size={14} className="text-blue-600 shrink-0" /> : h.kind === "conj" ? <Repeat2 size={14} className="text-blue-600 shrink-0" /> : <BookOpen size={14} className="text-blue-600 shrink-0" />}
                        {t(h.title)}
                      </span>
                    </td>
                    <td className={`py-3 pr-4 ${c.sub}`}>{t(h.date)}</td>
                    <td className={`py-3 pr-4 font-mono2 ${c.sub}`}>{h.minutes} min</td>
                    <td className="py-3"><Pill tone={h.kind === "exam" ? "green" : "blue"}>{h.result}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// Conjugation coverage: how many of the eight tenses have been touched, and
// which ones hold up. Empty state is an invitation rather than a blank card —
// this panel is most users' first sight of the tab.
function ConjugationPanel({ data }) {
  const { c, t } = useApp();
  if (!data || data.count === 0) {
    return (
      <Card className="p-6 flex flex-col">
        <h3 className={`font-display font-bold mb-1 ${c.text}`}>{t("Conjugaison")}</h3>
        <p className={`text-sm ${c.faint}`}>{t("Aucune série terminée pour l'instant.")}</p>
        <RouteLink r="conjugation" className="mt-auto pt-6 text-sm font-semibold text-blue-600 inline-flex items-center gap-1.5">
          <Repeat2 size={15} aria-hidden="true" /> {t("Choisir un temps à travailler")}
        </RouteLink>
      </Card>
    );
  }
  const covered = Math.round((data.tensesPracticed / data.tensesTotal) * 100);
  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h3 className={`font-display font-bold ${c.text}`}>{t("Conjugaison")}</h3>
        <span className={`text-sm font-mono2 font-semibold ${c.sub}`}>{data.avg} % {t("de moyenne")}</span>
      </div>
      <p className={`text-sm ${c.faint} mb-4`}>
        {data.count} {t(data.count > 1 ? "séries terminées" : "série terminée")} · {data.tensesPracticed}/{data.tensesTotal} {t("temps travaillés")}
      </p>
      <ProgressBar pct={covered} tone="grad" />

      <div className="mt-5 space-y-3">
        {data.byTense.slice(0, 5).map((row) => (
          <div key={row.tenseId}>
            <div className="flex justify-between items-center text-sm mb-1.5">
              <span className={`font-medium ${c.text}`}>{t(row.title)}</span>
              <span className={`font-mono2 font-semibold ${c.sub}`}>{row.avg} %</span>
            </div>
            <ProgressBar pct={row.avg} />
          </div>
        ))}
      </div>

      {data.weakest && (
        <p className={`mt-5 text-xs ${c.faint}`}>
          {t("À revoir en priorité :")} <strong className={c.sub}>{t(data.weakest.title)}</strong> ({data.weakest.avg} %).
        </p>
      )}
    </Card>
  );
}
