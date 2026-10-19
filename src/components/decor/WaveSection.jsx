import { useApp } from "@/context/AppContext";
import { SectionDecor } from "./SectionDecor";

// Landing-page sections alternate between a soft tinted block and a plain
// one (white in light mode, since the page canvas itself is the tint; the
// page colour in dark mode). Where a plain section follows a tinted one it can open with a
// single tall, gentle wave: the previous section's tint flows down into it in
// one wide curve. Every other boundary stays straight, so the waves stay rare
// enough to read as deliberate.

export const TINT = { light: "#EDF1F7", dark: "#0B1222" };

// One broad undulation across the full width (viewBox 1440×160, filled above
// the curve with the previous section's tint).
const WAVES = [
  "M0 0H1440V24C1340 4 1240 6 1140 40S900 110 700 96 380 40 220 70 60 140 0 150Z",
  "M0 0H1440V120C1320 150 1180 120 1010 70S700 20 520 46 160 120 0 70Z",
];

// How far down the cap the curve sits at a given point across the width
// (0 = top of the cap, 1 = its bottom), so something can hang from the edge of
// the wave — the Halloween spiders (decor/themes.jsx). The curve part of each
// path (from its V onwards) is flattened once into points, then read by linear
// interpolation. `flip` mirrors it, like the cap's -scale-x-100.
const CAP_H = 160;
const curves = {};

function curvePoints(d) {
  const tok = d.match(/[A-Za-z]|-?\d*\.?\d+/g);
  const pts = [];
  let i = 0, cmd = "", x = 0, y = 0, c2 = null;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    if (cmd === "Z") break;
    if (cmd === "M") { x = num(); y = num(); }
    else if (cmd === "H") x = num();
    else if (cmd === "V") { y = num(); pts.push([x, y]); }
    else if (cmd === "C" || cmd === "S") {
      const p1 = cmd === "C" ? [num(), num()] : c2 ? [2 * x - c2[0], 2 * y - c2[1]] : [x, y];
      const p2 = [num(), num()];
      const p3 = [num(), num()];
      for (let k = 1; k <= 24; k++) {
        const t = k / 24, u = 1 - t;
        const at = (n) => u * u * u * [x, y][n] + 3 * u * u * t * p1[n] + 3 * u * t * t * p2[n] + t * t * t * p3[n];
        pts.push([at(0), at(1)]);
      }
      c2 = p2;
      [x, y] = p3;
    }
  }
  return pts;
}

export function waveDepth(shape, flip, xFrac) {
  const i = shape % WAVES.length;
  const pts = (curves[i] ||= curvePoints(WAVES[i]));
  const x = (flip ? 1 - xFrac : xFrac) * 1440;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
    if ((x - x0) * (x - x1) <= 0) return (x0 === x1 ? y1 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)) / CAP_H;
  }
  return 0;
}

function WaveCap({ shape, flip, color }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 160" preserveAspectRatio="none"
      className={`absolute top-0 left-0 w-full h-20 md:h-32 lg:h-40 pointer-events-none ${flip ? "-scale-x-100" : ""}`}>
      <path d={WAVES[shape % WAVES.length]} fill={color} />
    </svg>
  );
}

export function WaveSection({ tinted = false, wave = null, flip = false, decor, id, className = "", children }) {
  const { dark } = useApp();
  const tint = dark ? TINT.dark : TINT.light;
  return (
    <section id={id} className={`relative ${className}`} style={{ background: tinted ? tint : dark ? undefined : "#FFFFFF" }}>
      {wave !== null && !tinted && <WaveCap shape={wave} flip={flip} color={tint} />}
      {decor && <SectionDecor variant={decor} wave={wave !== null && !tinted ? { shape: wave, flip } : null} />}
      {/* Room for the curve, so it never runs over the section's content. */}
      {wave !== null && !tinted && <div className="h-12 md:h-20 lg:h-24" aria-hidden="true" />}
      <div className="relative">{children}</div>
    </section>
  );
}
