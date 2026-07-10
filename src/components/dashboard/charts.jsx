import { useApp } from "@/context/AppContext";

// Dependency-free SVG chart primitives for the dashboard. All single-series
// (magnitude over time / per category), so one brand hue does the work; text
// stays in ink tokens, marks are thin with rounded data-ends, the grid is
// recessive, and every mark carries a native tooltip.

const BLUE = "#2563eb"; // brand blue-600, identical in both themes

// Score evolution: line over the last N results, 0-100 scale.
export function ScoreSparkline({ series, height = 88 }) {
  const { c, t } = useApp();
  if (series.length < 2) {
    return <p className={`text-xs py-6 text-center ${c.faint}`}>{t("Terminez encore quelques quiz pour voir votre courbe de progression.")}</p>;
  }
  const w = 100, h = 40, pad = 4;
  const x = (i) => pad + (i / (series.length - 1)) * (w - pad * 2);
  const y = (pct) => h - pad - (pct / 100) * (h - pad * 2);
  const path = series.map((e, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(e.pct).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ height }} className="w-full" role="img" aria-label={`${t("Évolution du score sur les")} ${series.length} ${t("derniers quiz")}`}>
      {[25, 50, 75].map((g) => (
        <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="currentColor" strokeWidth="0.3" className={c.faint} opacity="0.25" />
      ))}
      <path d={path} fill="none" stroke={BLUE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {series.map((e, i) => (
        <circle key={i} cx={x(i)} cy={y(e.pct)} r={i === series.length - 1 ? 2.4 : 1.6} fill={BLUE}>
          <title>{`${t(e.label)} · ${e.pct} %`}</title>
        </circle>
      ))}
    </svg>
  );
}

// Weekly activity: 7 thin bars with rounded tops, one per weekday.
export function WeekBars({ days, height = 96 }) {
  const { c } = useApp();
  const max = Math.max(1, ...days.map((d) => d.xp));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }} role="img" aria-label="Activité de la semaine, par jour">
      {days.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end" title={`${d.count} activité${d.count > 1 ? "s" : ""} · ${d.xp} XP`}>
          <div
            className={`w-2.5 rounded-full ${d.xp > 0 ? "" : c.track}`}
            style={{ height: `${Math.max(6, (d.xp / max) * 72)}%`, background: d.xp > 0 ? BLUE : undefined }}
          />
          <span className={`text-[10px] font-bold font-mono2 ${c.faint}`}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Section performance: horizontal magnitude bars, labeled directly.
export function SectionBars({ items }) {
  const { c } = useApp();
  if (items.length === 0) {
    return <p className={`text-xs py-4 text-center ${c.faint}`}>Aucune épreuve notée pour l'instant.</p>;
  }
  return (
    <div className="space-y-3" role="img" aria-label="Score moyen par épreuve">
      {items.map((s) => (
        <div key={s.label} title={`${s.label} · ${s.pct} % de moyenne`}>
          <div className="flex justify-between text-xs mb-1">
            <span className={`font-medium ${c.sub}`}>{s.label}</span>
            <span className={`font-mono2 font-semibold ${c.text}`}>{s.pct} %</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${c.track}`}>
            <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: BLUE }} />
          </div>
        </div>
      ))}
    </div>
  );
}
