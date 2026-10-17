// Vector decoration primitives for the page sides (dot clusters, dashed rings,
// blobs, squiggles…), in the brand palette. Pure SVG, sized by props, coloured
// by `color`; SectionDecor places and animates them.

export const BRAND = { blue: "#2E6BE6", violet: "#6C4FE0", red: "#D8354A" };

// A roughly circular cluster of dots, like a halftone disc.
export function DotGrid({ color, n = 9, gap = 16, r = 2.2 }) {
  const size = (n - 1) * gap + r * 4;
  const mid = (n - 1) / 2;
  const dots = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (Math.hypot(x - mid, y - mid) > mid + 0.35) continue;
      dots.push(<circle key={`${x}-${y}`} cx={r * 2 + x * gap} cy={r * 2 + y * gap} r={r} />);
    }
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill={color}>{dots}</svg>;
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

export function Blob({ color, size = 200, variant = 0 }) {
  const d = [
    "M110 8c40 6 78 40 84 86s-18 92-64 102S36 188 16 150 4 62 34 32 70 2 110 8Z",
    "M98 6c46-4 92 30 96 76s-26 76-58 98-82 22-108-14S2 92 26 52 52 10 98 6Z",
  ][variant % 2];
  return <svg width={size} height={size} viewBox="0 0 200 200"><path d={d} fill={color} /></svg>;
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
