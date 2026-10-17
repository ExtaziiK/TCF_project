import { useId } from "react";

// Vector decoration primitives for the page sides (dot clusters, dashed rings,
// blobs, squiggles…), in the brand palette. Pure SVG, sized by props, coloured
// by `color`; SectionDecor places and animates them.

export const BRAND = { blue: "#2E6BE6", violet: "#6C4FE0", red: "#D8354A", amber: "#F5A524" };

// A solid disc filled with a two-colour gradient — the "pop" accents.
export function GradientCircle({ from, to, size = 70 }) {
  const id = `gc${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </svg>
  );
}

// A cluster of flat dots: a halftone disc by default, or a `cols` × `n`
// rectangle when `cols` is given.
export function DotGrid({ color, n = 9, cols, gap = 16, r = 2.2 }) {
  const w = cols ?? n;
  const width = (w - 1) * gap + r * 4;
  const height = (n - 1) * gap + r * 4;
  const mid = (n - 1) / 2;
  const dots = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < w; x++) {
      if (!cols && Math.hypot(x - mid, y - mid) > mid + 0.35) continue;
      dots.push(<circle key={`${x}-${y}`} cx={r * 2 + x * gap} cy={r * 2 + y * gap} r={r} />);
    }
  }
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill={color}>{dots}</svg>;
}

export function DashedRing({ color, size = 120, stroke = 6 }) {
  const rr = size / 2 - stroke;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={size / 2} cy={size / 2} r={rr} stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${(Math.PI * rr) / 7} ${(Math.PI * rr) / 14}`} />
    </svg>
  );
}

export function Ring({ color, size = 48, stroke = 3 }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={size / 2} cy={size / 2} r={size / 2 - stroke} stroke={color} strokeWidth={stroke} />
    </svg>
  );
}

export function Dot({ color, size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill={color} /></svg>;
}

export const BLOBS = [
  "M110 8c40 6 78 40 84 86s-18 92-64 102S36 188 16 150 4 62 34 32 70 2 110 8Z",
  "M98 6c46-4 92 30 96 76s-26 76-58 98-82 22-108-14S2 92 26 52 52 10 98 6Z",
  "M60 14c30-14 72-12 100 10s40 62 30 96-40 64-80 72-76-10-94-44S4 76 18 50 34 26 60 14Z",
  "M122 12c34 10 66 36 70 74s-12 66-40 86-70 26-102 6S2 124 8 88 40 22 74 12s30-6 48 0Z",
];

export function Blob({ color, size = 200, variant = 0, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} preserveAspectRatio="none">
      <path d={BLOBS[variant % BLOBS.length]} fill={color} />
    </svg>
  );
}

export function Squiggle({ color, width = 120, stroke = 4 }) {
  return (
    <svg width={width} height={width / 4} viewBox="0 0 120 30" fill="none">
      <path d="M3 15c9-14 18-14 27 0s18 14 27 0 18-14 27 0 18 14 27 0 9-7 6-7" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Cross({ color, size = 22, stroke = 4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round">
      <path d="M11 3v16M3 11h16" />
    </svg>
  );
}

export function Triangle({ color, size = 34, stroke = 3 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
      <path d="M17 4 30 28H4Z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
    </svg>
  );
}
