import { useId, useState } from "react";
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

// Round a max up to a 1/2/2.5/5 × 10^n step so the gridlines land on round values.
function niceMax(v) {
  if (v <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].find((m) => m * mag >= v) * mag;
}

// Compact axis numbers: 1200 → "1,2k", 2500000 → "2,5M".
function compact(n) {
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`.replace(".", ",");
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}k`.replace(".", ",");
  return String(Math.round(n));
}

// Change over time (admin overview, traffic, revenue): one brand-blue line over
// a soft gradient area, a recessive 3-step grid with its scale on the left, the
// peak labeled directly, and a crosshair + tooltip that follows the pointer.
// The SVG stretches to the container; text and markers are HTML on top of it
// so they never distort.
export function TrendChart({ points, height = 140, label, format = String }) {
  const { c, dark } = useApp();
  const [hover, setHover] = useState(null);
  const gid = `trend${useId().replace(/:/g, "")}`;
  const n = points.length;
  if (n === 0) return null;
  const top = niceMax(Math.max(...points.map((p) => p.value)));
  const x = (i) => (n === 1 ? 50 : (i / (n - 1)) * 100); // % of plot width
  const y = (v) => 100 - (v / top) * 100;                 // % of plot height
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(" ");
  const area = `${line} L${x(n - 1)},100 L${x(0)},100 Z`;
  const peak = points.reduce((b, p, i) => (p.value > points[b].value ? i : b), 0);
  const stride = n > 24 ? 4 : n > 12 ? 2 : 1;
  const total = points.reduce((s, p) => s + p.value, 0);
  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(n === 1 ? 0 : Math.round(f * (n - 1)));
  };
  const h = hover != null ? points[hover] : null;
  const marker = (i, big) => (
    <span
      className={`absolute rounded-full pointer-events-none ${big ? "w-3 h-3" : "w-2 h-2"}`}
      style={{ left: `${x(i)}%`, top: `${y(points[i].value)}%`, transform: "translate(-50%,-50%)", background: BLUE, boxShadow: `0 0 0 2px ${dark ? "#0f172a" : "#fff"}` }}
    />
  );
  return (
    <div role="img" aria-label={`${label} — total ${format(total)}, pic ${format(points[peak].value)} (${points[peak].title || points[peak].label})`}>
      <div className="flex" style={{ height }}>
        <div className="relative w-9 shrink-0">
          {[0, 0.5, 1].map((f) => (
            <span key={f} className={`absolute right-2 text-[9px] font-mono2 -translate-y-1/2 ${c.faint}`} style={{ top: `${100 - f * 100}%` }}>{compact(top * f)}</span>
          ))}
        </div>
        <div className="relative flex-1 cursor-crosshair touch-none" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={dark ? 0.35 : 0.22} />
                <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 50, 100].map((g) => (
              <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="currentColor" className={c.faint} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity={g === 100 ? 0.5 : 0.25} strokeDasharray={g === 100 ? undefined : "3 3"} />
            ))}
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {h && <line x1={x(hover)} x2={x(hover)} y1="0" y2="100" stroke={BLUE} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.45" />}
          </svg>
          {/* Peak, labeled directly; hidden while hovering so there's one readout at a time. */}
          {!h && points[peak].value > 0 && (
            <>
              {marker(peak, false)}
              <span
                className={`absolute text-[10px] font-mono2 font-bold whitespace-nowrap pointer-events-none ${c.text}`}
                style={{ left: `${x(peak)}%`, top: `${y(points[peak].value)}%`, transform: `translate(${peak > n * 0.75 ? "-100%" : peak < n * 0.25 ? "0" : "-50%"}, -150%)` }}
              >{format(points[peak].value)}</span>
            </>
          )}
          {h && (
            <>
              {marker(hover, true)}
              <div
                className={`absolute z-10 px-2.5 py-1.5 rounded-lg text-[11px] whitespace-nowrap pointer-events-none shadow-lg border ${c.card} ${c.border}`}
                style={{ left: `${x(hover)}%`, top: 0, transform: `translateX(${hover > (n - 1) / 2 ? "calc(-100% - 10px)" : "10px"})` }}
              >
                <div className={`font-mono2 ${c.faint}`}>{h.title || h.label}</div>
                <div className={`font-bold font-mono2 text-sm ${c.text}`}>{format(h.value)}</div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="relative h-4 mt-1.5 ml-9">
        {points.map((p, i) => ((i % stride === 0 && n - 1 - i >= stride) || i === n - 1) && (
          <span key={p.key} className={`absolute text-[9px] font-mono2 whitespace-nowrap -translate-x-1/2 ${hover === i ? `font-bold ${c.text}` : c.faint}`} style={{ left: `${x(i)}%` }}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

// Daily counts over the last N days (admin overview, traffic).
export function DayBars({ days, height, label }) {
  return <TrendChart points={days.map((d) => ({ key: d.date, label: d.date.slice(8), title: d.date, value: d.count }))} height={height} label={label} />;
}

// Money over time (admin Revenus): buckets may be days or months.
export function MoneyBars({ bars, height = 160, label, format = String }) {
  return <TrendChart points={bars} height={height} label={label} format={format} />;
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
