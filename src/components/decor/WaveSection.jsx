import { useApp } from "@/context/AppContext";
import { SectionDecor } from "./SectionDecor";

// Landing-page sections alternate between a soft tinted block and the plain
// page colour. Where a plain section follows a tinted one it can open with a
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
    <section id={id} className={`relative ${className}`} style={tinted ? { background: tint } : undefined}>
      {wave !== null && !tinted && <WaveCap shape={wave} flip={flip} color={tint} />}
      {decor && <SectionDecor variant={decor} />}
      {/* Room for the curve, so it never runs over the section's content. */}
      {wave !== null && !tinted && <div className="h-12 md:h-20 lg:h-24" aria-hidden="true" />}
      <div className="relative">{children}</div>
    </section>
  );
}
