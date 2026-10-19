import { useEffect, useRef, useState } from "react";

// The control tower's radar: one axis per épreuve (CO top, CE right, EE
// bottom, EO left), the candidate's NCLC levels as a glowing polygon, and the
// NCLC `threshold` as a dashed "clearance zone" diamond. A corner that reaches
// the zone glows green; one short of it pings red. Levels glide to their new
// value (eased, ~0.45 s) so dragging a slider morphs the shape; under
// prefers-reduced-motion they jump.

const SIZE = 320;
const C = SIZE / 2;
const R = 122;
const AXES = { co: -90, ce: 0, ee: 90, eo: 180 }; // degrees, SVG y down
const OK = "#34D399";
const SHORT = "#FB7185";

const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const point = (level, deg) => {
  const r = (R * Math.max(0, Math.min(10, level))) / 10;
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const diamond = (level) => Object.values(AXES).map((deg) => point(level, deg).join(",")).join(" ");

// Eases an array of numbers toward `target` with requestAnimationFrame.
function useTween(target, ms = 450) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const key = target.join(",");
  useEffect(() => {
    if (reducedMotion()) { from.current = target; setValue(target); return undefined; }
    const start = window.performance.now();
    const a = from.current;
    let raf;
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms);
      const e = 1 - (1 - k) ** 3;
      const cur = a.map((x, i) => x + (target[i] - x) * e);
      from.current = cur;
      setValue(cur);
      if (k < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
    // `key` stands for `target`'s contents; a new array each render must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms]);
  return value;
}

export function Radar({ levels, threshold, order, accents, labels, cleared, ariaLabel }) {
  const shown = useTween(order.map((s) => levels[s] || 0));
  const zone = cleared ? OK : "#FBBF24";

  return (
    <div className="relative w-full max-w-[340px] aspect-square mx-auto" role="img" aria-label={ariaLabel}>
      {/* Rotating sweep beam, behind the drawing. */}
      <div className="radar-sweep" aria-hidden="true" />
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative w-full h-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1E2A6E" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0A1030" stopOpacity="0.2" />
          </radialGradient>
          <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2E6BE6" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#6C4FE0" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#D8354A" stopOpacity="0.5" />
          </linearGradient>
          <filter id="radar-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <circle cx={C} cy={C} r={R + 10} fill="url(#radar-bg)" stroke="rgba(148,163,255,.25)" />
        {[0.25, 0.5, 0.75].map((f) => (
          <circle key={f} cx={C} cy={C} r={(R + 10) * f} fill="none" stroke="rgba(148,163,255,.10)" />
        ))}
        {[2, 4, 6, 8, 10].map((l) => (
          <polygon key={l} points={diamond(l)} fill="none" stroke="rgba(148,163,255,.16)" strokeWidth="1" />
        ))}
        {Object.values(AXES).map((deg) => {
          const [x, y] = point(10, deg);
          return <line key={deg} x1={C} y1={C} x2={x} y2={y} stroke="rgba(148,163,255,.22)" strokeDasharray="2 4" />;
        })}
        {[4, 7, 10].map((l) => {
          const [x, y] = point(l, -90);
          return <text key={l} x={x + 6} y={y + 3} fontSize="9" fontWeight="700" fill="rgba(203,213,255,.55)" fontFamily="ui-monospace,monospace">{l}</text>;
        })}

        {/* Clearance zone. */}
        <polygon points={diamond(threshold)} fill={`${zone}10`} stroke={zone} strokeWidth="2" strokeDasharray="7 5" filter="url(#radar-glow)" className="radar-zone" />
        <text x={point(threshold, 0)[0] - 4} y={C - 8} textAnchor="end" fontSize="9.5" fontWeight="800" letterSpacing="1.5" fill={zone} fontFamily="ui-monospace,monospace">
          NCLC {threshold}
        </text>

        {/* The candidate. */}
        <polygon
          points={shown.map((l, i) => point(l, AXES[order[i]]).join(",")).join(" ")}
          fill="url(#radar-fill)" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinejoin="round" filter="url(#radar-glow)"
        />
        {shown.map((l, i) => {
          const s = order[i];
          const [x, y] = point(l, AXES[s]);
          const met = (levels[s] || 0) >= threshold;
          const col = met ? OK : SHORT;
          return (
            <g key={s}>
              <circle cx={x} cy={y} r="5" fill={col} className="radar-ping" />
              <circle cx={x} cy={y} r="5.5" fill={col} stroke="#0A1030" strokeWidth="2" />
            </g>
          );
        })}
        <circle cx={C} cy={C} r="3" fill="#C7D2FE" />
      </svg>

      {/* Axis labels, outside the drawing. */}
      {order.map((s) => {
        const pos = {
          co: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
          ce: "right-0 top-1/2 translate-x-1/4 -translate-y-1/2",
          ee: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
          eo: "left-0 top-1/2 -translate-x-1/4 -translate-y-1/2",
        }[s];
        const met = (levels[s] || 0) >= threshold;
        return (
          <span key={s} className={`absolute ${pos} px-2 py-1 rounded-full text-[10px] font-extrabold tracking-wider font-mono2 whitespace-nowrap`}
            style={{ background: "rgba(10,16,48,.85)", color: accents[s], boxShadow: `0 0 0 1px ${accents[s]}55, 0 0 14px ${accents[s]}33` }}>
            {labels[s]} · <span style={{ color: met ? OK : SHORT }}>{levels[s] || "<4"}</span>
          </span>
        );
      })}
    </div>
  );
}
