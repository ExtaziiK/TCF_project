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

// Backdrop for plain sections: two large blurred brand glows and a faded dot
// pattern behind the content, so the white cards sit on colour instead of
// melting into a white page. Placement and colours vary per section.
const BACKDROPS = {
  features: { a: ["#2E6BE6", "top-[8%] left-[8%]"], b: ["#6C4FE0", "bottom-[6%] right-[10%]"], dots: "text-blue-500/25" },
  testimonials: { a: ["#D8354A", "top-[10%] right-[12%]"], b: ["#2E6BE6", "bottom-[8%] left-[10%]"], dots: "text-violet-500/25" },
  calculator: { a: ["#6C4FE0", "top-[6%] left-[14%]"], b: ["#D8354A", "bottom-[10%] right-[8%]"], dots: "text-rose-500/20" },
  pricing: { a: ["#2E6BE6", "top-[12%] right-[10%]"], b: ["#F5A524", "bottom-[8%] left-[12%]"], dots: "text-blue-500/25" },
  cta: { a: ["#6C4FE0", "top-[0%] left-[25%]"], b: ["#D8354A", "bottom-[0%] right-[25%]"], dots: "text-violet-500/25" },
};

function Backdrop({ variant, dark }) {
  const v = BACKDROPS[variant];
  if (!v) return null;
  const glow = `absolute w-[22rem] h-[22rem] md:w-[34rem] md:h-[34rem] rounded-full blur-3xl ${dark ? "opacity-[.14]" : "opacity-[.2]"}`;
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={`${glow} ${v.a[1]}`} style={{ background: v.a[0] }} />
      <div className={`${glow} ${v.b[1]}`} style={{ background: v.b[0] }} />
      <div className={`absolute inset-x-[6%] top-[12%] bottom-[8%] dot-pattern ${v.dots}`} />
    </div>
  );
}

export function WaveSection({ tinted = false, wave = null, flip = false, decor, id, className = "", children }) {
  const { dark } = useApp();
  const tint = dark ? TINT.dark : TINT.light;
  return (
    <section id={id} className={`relative ${className}`} style={tinted ? { background: tint } : undefined}>
      {!tinted && <Backdrop variant={decor} dark={dark} />}
      {wave !== null && !tinted && <WaveCap shape={wave} flip={flip} color={tint} />}
      {decor && <SectionDecor variant={decor} />}
      {/* Room for the curve, so it never runs over the section's content. */}
      {wave !== null && !tinted && <div className="h-12 md:h-20 lg:h-24" aria-hidden="true" />}
      <div className="relative">{children}</div>
    </section>
  );
}
