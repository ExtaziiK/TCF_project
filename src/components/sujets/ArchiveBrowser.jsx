import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, FolderOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Segmented } from "@/components/common";

const FILL = "bg-[var(--tool-fill,#2563EB)] text-white";

// The most recent month of a year (months arrive in display order, which is
// not the same for the current year and the past ones).
const latestMonth = (y) => (y?.months || []).reduce((best, m) => (!best || m.monthNum > best.monthNum ? m : best), null);

// Archive browser shared by the EE and EO subject pages, laid out like
// Révision: a control bar (année, mois, plus the page's own `controls`), then
// the month dealt one unit at a time — a combinaison for EE, a partie for EO.
// Numbered chips jump anywhere, Précédent/Suivant sit both above and below the
// card, and the ← → keys work too, so moving between units never needs a
// scroll. Opens on the most recent month.
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
  const [index, setIndex] = useState(0);
  const deckRef = useRef(null);

  const yearData = years.find((y) => y.year === year) || years[0] || null;
  const months = useMemo(() => [...(yearData?.months || [])].sort((a, b) => a.monthNum - b.monthNum), [yearData]);
  const monthData = months.find((m) => m.key === mkey) || latestMonth(yearData);
  const list = useMemo(() => (monthData ? units(monthData, yearData) : []), [units, monthData, yearData]);
  const n = list.length;
  const i = Math.min(index, Math.max(0, n - 1));

  // A new month (or tâche) starts at its first unit.
  useEffect(() => { setIndex(0); }, [monthData?.key, resetKey]);

  // Moving from the bottom buttons after reading a long card would leave the
  // next one scrolled half out of view: bring the deck's top back when it is
  // above the fold. Clicks near the top don't scroll at all.
  const goTo = useCallback((k) => {
    setIndex(Math.max(0, Math.min(n - 1, k)));
    window.requestAnimationFrame(() => {
      const el = deckRef.current;
      if (el && el.getBoundingClientRect().top < 96) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [n]);

  useEffect(() => {
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "")) return;
      if (e.key === "ArrowRight") goTo(i + 1);
      if (e.key === "ArrowLeft") goTo(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, i]);

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

  const pickYear = (y) => { setYear(y); setMkey(null); };
  const current = list[i];
  const navBtn = `inline-flex items-center gap-1.5 rounded-full text-sm font-semibold disabled:opacity-40 transition-colors`;

  return (
    <>
      {/* ── control bar ─────────────────────────────────────────────────── */}
      <Card className="p-3 md:p-4 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented
            items={years.map((y) => ({ id: y.year, label: y.year }))}
            value={yearData?.year} onChange={pickYear} label={t("Année")}
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

      {/* ── the deck ──────────────────────────────────────────────────── */}
      <div ref={deckRef} className="scroll-mt-28">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex flex-wrap items-center gap-2">{monthData && summary?.(monthData, yearData)}</div>
          {n > 1 && (
            <div className="flex items-center gap-2">
              <span className={`font-mono2 text-sm font-semibold ${c.faint}`}>{i + 1} / {n}</span>
              <button type="button" onClick={() => goTo(i - 1)} disabled={i === 0} aria-label={t("Précédent")}
                className={`${navBtn} w-9 h-9 justify-center border ${c.border} ${c.card} ${c.text} ${c.hoverSoft}`}><ChevronLeft size={16} /></button>
              <button type="button" onClick={() => goTo(i + 1)} disabled={i === n - 1} aria-label={t("Suivant")}
                className={`${navBtn} w-9 h-9 justify-center ${FILL}`}><ChevronRight size={16} /></button>
            </div>
          )}
        </div>

        {n > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label={t(unitName)}>
            {list.map((u, k) => (
              <button type="button" key={u.key} onClick={() => goTo(k)} aria-current={k === i ? "step" : undefined}
                aria-label={`${t(unitName)} ${u.n}`}
                className={`min-w-9 h-9 px-2 rounded-lg font-mono2 text-xs font-bold transition-colors ${k === i ? FILL : `border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
                {String(u.n).padStart(2, "0")}
              </button>
            ))}
          </div>
        )}

        {current ? (
          <div key={current.key} className="rise">{current.node}</div>
        ) : (
          <Card className="p-10 text-center">
            <p className={`text-sm ${c.sub}`}>{t("Aucun sujet pour ce mois.")}</p>
          </Card>
        )}

        {n > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => goTo(i - 1)} disabled={i === 0}
              className={`${navBtn} px-4 py-2.5 border ${c.border} ${c.card} ${c.text} ${c.hoverSoft}`}>
              <ChevronLeft size={16} /> {t("Précédent")}
            </button>
            <span className={`hidden sm:block text-xs ${c.faint}`}>{t("Flèches ← → du clavier")}</span>
            <button type="button" onClick={() => goTo(i + 1)} disabled={i === n - 1}
              className={`${navBtn} px-4 py-2.5 ${FILL}`}>
              {t("Suivant")} <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
