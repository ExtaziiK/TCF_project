import { GraduationCap, BookOpen } from "lucide-react";
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

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      {/* study time this week */}
      <Card className="p-6">
        <h3 className={`font-display font-bold mb-1 ${c.text}`}>{t("Temps d'étude cette semaine")}</h3>
        <p className={`text-sm ${c.faint} mb-6`}>{formatDuration(data.week.minutes)} {t("au total ·")} {data.week.activeDays} {t(data.week.activeDays > 1 ? "jours actifs" : "jour actif")}</p>
        <div className="flex items-end gap-3 h-44" role="img" aria-label={t("Minutes d'étude par jour")}>
          {data.week.days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2" title={`${d.minutes} min · ${d.count} ${t(d.count > 1 ? "activités" : "activité")}`}>
              <span className={`text-[10px] font-mono2 ${c.faint}`}>{d.minutes > 0 ? `${d.minutes}'` : "—"}</span>
              <div className="w-full rounded-t-xl grad-brand transition-all" style={{ height: `${(d.minutes / maxMin) * 100}%`, minHeight: d.minutes ? 8 : 3, opacity: d.minutes ? 1 : 0.15 }} />
              <span className={`text-xs font-medium ${c.sub}`}>{dayInitial(d.label, i)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* score evolution */}
      <Card className="p-6 flex flex-col">
        <h3 className={`font-display font-bold mb-1 ${c.text}`}>{t("Évolution du score")}</h3>
        <p className={`text-sm ${c.faint} mb-6`}>{t("Vos sessions notées les plus récentes (compréhension orale et écrite, examens blancs).")}</p>
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
                        {h.kind === "exam" ? <GraduationCap size={14} className="text-blue-600 shrink-0" /> : <BookOpen size={14} className="text-blue-600 shrink-0" />}
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
