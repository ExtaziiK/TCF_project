import { useMemo, useState } from "react";
import { CalendarDays, FolderOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Segmented } from "@/components/common";
import { SujetsDeck } from "@/components/sujets/SujetsDeck";

const FILL = "bg-[var(--tool-fill,#2563EB)] text-white";

// The most recent month of a year (months arrive in display order, which is
// not the same for the current year and the past ones).
const latestMonth = (y) => (y?.months || []).reduce((best, m) => (!best || m.monthNum > best.monthNum ? m : best), null);

// Archive browser shared by the EE and EO Anciens sujets pages, laid out like
// Révision: a control bar (année, mois, plus the page's own `controls`), then
// the month in a SujetsDeck, one unit at a time. Opens on the most recent month.
//
//   units(month, year)  -> [{ key, n, node }] for the selected month
//   unitName            -> "Combinaison" | "Partie" (labels the chips)
//   resetKey            -> anything else that changes the units (EO's tâche):
//                          the deck goes back to its first unit when it changes
//   controls(month)     -> extra control-bar content, or null
//   summary(month, year)-> pills shown above the deck
export function ArchiveBrowser({ years, loading, units, unitName, resetKey, controls, summary }) {
  const { c, t } = useApp();
  const [year, setYear] = useState(null);
  const [mkey, setMkey] = useState(null);

  const yearData = years.find((y) => y.year === year) || years[0] || null;
  const months = useMemo(() => [...(yearData?.months || [])].sort((a, b) => a.monthNum - b.monthNum), [yearData]);
  const monthData = months.find((m) => m.key === mkey) || latestMonth(yearData);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Card className={`h-24 animate-pulse ${c.track}`} />
        <Card className={`h-96 animate-pulse ${c.track}`} />
      </div>
    );
  }

  if (!years.length) {
    return (
      <Card className="p-10 text-center">
        <FolderOpen size={32} className="text-blue-600 mx-auto mb-4" />
        <p className={`font-display font-bold ${c.text}`}>{t("Bientôt disponible")}</p>
        <p className={`mt-2 text-sm ${c.sub}`}>{t("Les sujets seront ajoutés très prochainement.")}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-3 md:p-4 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented
            items={years.map((y) => ({ id: y.year, label: y.year }))}
            value={yearData?.year} onChange={(y) => { setYear(y); setMkey(null); }} label={t("Année")}
          />
          {monthData && controls?.(monthData)}
        </div>
        <div className="mt-3 flex items-center gap-1.5 flex-wrap" role="group" aria-label={t("Mois")}>
          <span className={`text-xs font-semibold mr-1 flex items-center gap-1 ${c.faint}`}><CalendarDays size={13} aria-hidden="true" /> {t("Mois")}</span>
          {months.map((m) => {
            const on = m.key === monthData?.key;
            return (
              <button type="button" key={m.key} onClick={() => setMkey(m.key)} aria-pressed={on}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${on ? `${FILL} border-transparent` : `${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
                {t(m.month)}
              </button>
            );
          })}
        </div>
      </Card>

      {monthData && (
        <SujetsDeck
          key={`${monthData.key}|${resetKey ?? ""}`}
          units={units(monthData, yearData)}
          unitName={unitName}
          summary={summary?.(monthData, yearData)}
        />
      )}
    </>
  );
}
