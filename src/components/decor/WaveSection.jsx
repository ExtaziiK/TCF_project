import { useId } from "react";
import { useApp } from "@/context/AppContext";
import { SectionDecor } from "./SectionDecor";
import { BRAND } from "./shapes";

// Landing-page sections, each split from the previous one by a vector wave.
// Every section paints its own background tone and draws its top edge as a
// wave in that same tone, overlapping the previous section's bottom padding —
// so every boundary is a curve, even between two light sections. A second,
// translucent accent wave peeks out above the edge, and soft "ribbons" (the
// wide wavy bands of the design reference) run through the background.
// Tone, wave shape, mirroring, accent and ribbons all vary per section.

// Horizontal gradients (left → right). `plain` matches the page canvas exactly.
const TONES = {
  plain: { light: ["#F8FAFC"], dark: ["#020617"] },
  mist: { light: ["#F1F5FE", "#F4F2FE"], dark: ["#0A1224", "#0D1027"] },
  blue: { light: ["#E5EEFE", "#E9EFFE", "#EEEBFE"], dark: ["#0C1935", "#0F1938", "#14153A"] },
  violet: { light: ["#EEE9FE", "#F2ECFE", "#F9EBF4"], dark: ["#15133A", "#191438", "#211431"] },
  rose: { light: ["#FDEAEE", "#FBEDF3", "#F0EDFE"], dark: ["#26121E", "#22122B", "#171431"] },
  dawn: { light: ["#E6EFFE", "#F0ECFE", "#FDE9EE"], dark: ["#0D1A36", "#171436", "#26131F"] },
};

const gradient = (stops) => (stops.length === 1 ? stops[0] : `linear-gradient(90deg, ${stops.join(", ")})`);

function GradientDef({ id, stops, opacity = 1 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      {stops.map((s, i) => (
        <stop key={i} offset={stops.length === 1 ? "0%" : `${(i / (stops.length - 1)) * 100}%`} stopColor={s} stopOpacity={opacity} />
      ))}
      {stops.length === 1 && <stop offset="100%" stopColor={stops[0]} stopOpacity={opacity} />}
    </linearGradient>
  );
}

// Top-edge silhouettes (viewBox 1440×80, filled below the curve).
const WAVES = [
  "M0 80V40C180 10 360 0 540 20s360 50 540 30S1320 0 1440 20V80Z",
  "M0 80V56C240 20 480 4 720 24s480 52 720 16V80Z",
  "M0 80V30C120 50 240 64 400 50S700 6 880 10s340 50 560 26V80Z",
  "M0 80V48C140 28 280 20 420 34s260 34 400 20 280-40 420-30 160 30 200 34V80Z",
  "M0 80V14C300 30 600 72 960 60S1320 30 1440 40V80Z",
];

function TopWave({ shape, flip, stops, accent, dark }) {
  const id = useId().replace(/:/g, "");
  const d = WAVES[shape % WAVES.length];
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none"
      className={`absolute left-0 w-full h-10 md:h-16 overflow-visible pointer-events-none bottom-[calc(100%-1px)] ${flip ? "-scale-x-100" : ""}`}>
      <defs>
        <GradientDef id={`wf${id}`} stops={stops} />
        <linearGradient id={`wa${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity={dark ? 0.22 : 0.18} />
          <stop offset="100%" stopColor={accent} stopOpacity={dark ? 0.06 : 0.05} />
        </linearGradient>
      </defs>
      {/* Accent crest: the same curve, raised and mirrored, behind the edge. */}
      <path d={d} fill={`url(#wa${id})`} transform="translate(1440 -14) scale(-1 1)" />
      <path d={d} fill={`url(#wf${id})`} />
    </svg>
  );
}

// Wide translucent bands (viewBox 1440×240), like the design reference.
const RIBBONS = [
  "M0 40C300-10 620 40 900 100s400 50 540-30v40c-140 80-440 80-680 40S280 90 0 170Z",
  "M0 150c260 60 640 70 980 0s360-100 460-80v50c-140-20-340 20-540 70S300 260 0 210Z",
  "M0 120c240-60 480-60 720 0s480 60 720 0v24c-240 60-480 60-720 0S240 84 0 144Z",
];
const RIBBON_POS = { top: "top-0", bottom: "bottom-0", middle: "top-1/2 -translate-y-1/2" };

export function Ribbons({ items }) {
  const { dark } = useApp();
  const id = useId().replace(/:/g, "");
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map(({ shape = 0, at = "top", from, to, flip }, i) => (
        <svg key={i} viewBox="0 0 1440 240" preserveAspectRatio="none"
          className={`absolute left-0 w-full h-40 md:h-64 ${RIBBON_POS[at]} ${flip ? "-scale-x-100" : ""}`}>
          <defs>
            <linearGradient id={`rb${id}${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={from} stopOpacity={dark ? 0.12 : 0.15} />
              <stop offset="100%" stopColor={to || from} stopOpacity={dark ? 0.04 : 0.06} />
            </linearGradient>
          </defs>
          <path d={RIBBONS[shape % RIBBONS.length]} fill={`url(#rb${id}${i})`} />
        </svg>
      ))}
    </div>
  );
}

export function WaveSection({ tone = "plain", wave = 0, flip = false, accent = BRAND.blue, ribbons = [], decor, id, className = "", children }) {
  const { dark } = useApp();
  const stops = TONES[tone][dark ? "dark" : "light"];
  return (
    <section id={id} className={`relative ${className}`} style={{ background: gradient(stops) }}>
      <TopWave shape={wave} flip={flip} stops={stops} accent={accent} dark={dark} />
      {ribbons.length > 0 && <Ribbons items={ribbons} />}
      {decor && <SectionDecor variant={decor} />}
      <div className="relative">{children}</div>
    </section>
  );
}
