import { useApp } from "@/context/AppContext";
import { SectionDecor } from "./SectionDecor";
import { BRAND, Blob, DotGrid } from "./shapes";

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

// Backdrop for plain sections: large flat pastel blobs and a crisp block of
// solid dots behind the content, so the white cards sit on colour instead of
// melting into a white page. Sharp edges and flat fills only — no blur, no
// fades. Blob shape, rotation, colour and placement vary per section.
const PASTEL = {
  light: { blue: "#E2EBFD", violet: "#ECE7FD", rose: "#FCE5EA", amber: "#FDEFD6" },
  dark: { blue: "#0E1A36", violet: "#17153A", rose: "#26131E", amber: "#251C0C" },
};
const BACKDROPS = {
  features: {
    blobs: [["blue", 0, "-top-6 -left-24 w-[26rem] h-[22rem] md:w-[40rem] md:h-[32rem] -rotate-12"], ["violet", 2, "-bottom-10 -right-20 w-[20rem] h-[18rem] md:w-[30rem] md:h-[26rem] rotate-6"]],
    dots: [BRAND.violet, "bottom-[14%] left-[9%]"],
  },
  testimonials: {
    blobs: [["rose", 3, "top-[8%] -right-24 w-[24rem] h-[22rem] md:w-[38rem] md:h-[30rem] rotate-12"], ["blue", 1, "-bottom-12 -left-16 w-[18rem] h-[16rem] md:w-[26rem] md:h-[22rem]"]],
    dots: [BRAND.red, "top-[16%] left-[10%]"],
  },
  calculator: {
    blobs: [["violet", 1, "top-[4%] -left-20 w-[26rem] h-[24rem] md:w-[40rem] md:h-[34rem] rotate-3"], ["amber", 0, "-bottom-8 -right-16 w-[18rem] h-[16rem] md:w-[26rem] md:h-[22rem] -rotate-6"]],
    dots: [BRAND.blue, "bottom-[12%] right-[10%]"],
  },
  pricing: {
    blobs: [["blue", 3, "top-[10%] -right-28 w-[26rem] h-[22rem] md:w-[42rem] md:h-[34rem] -rotate-6"], ["amber", 2, "bottom-[6%] -left-24 w-[20rem] h-[18rem] md:w-[30rem] md:h-[26rem] rotate-12"]],
    dots: [BRAND.amber, "top-[18%] left-[8%]"],
  },
  cta: {
    blobs: [["violet", 2, "-top-10 left-[8%] w-[22rem] h-[18rem] md:w-[34rem] md:h-[26rem] rotate-6"], ["rose", 0, "-bottom-14 right-[8%] w-[22rem] h-[18rem] md:w-[32rem] md:h-[24rem] -rotate-12"]],
    dots: [BRAND.violet, "bottom-[16%] right-[18%]"],
  },
};

function Backdrop({ variant, dark }) {
  const v = BACKDROPS[variant];
  if (!v) return null;
  const pastel = PASTEL[dark ? "dark" : "light"];
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {v.blobs.map(([tone, shape, pos], i) => (
        <Blob key={i} color={pastel[tone]} variant={shape} className={`absolute ${pos}`} />
      ))}
      <div className={`absolute hidden sm:block ${v.dots[1]} ${dark ? "opacity-60" : ""}`}>
        <DotGrid color={v.dots[0]} n={6} cols={8} gap={18} r={3} />
      </div>
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
