import { useApp } from "@/context/AppContext";

// Soft brand-coloured waves behind every page, so the flat canvas doesn't read
// as bare white. Fixed to the viewport and purely decorative: it sits under all
// in-flow content (the shell is `isolate`, this layer is -z-10), never takes
// pointer events, and cards keep their own solid backgrounds on top. Colours
// follow the .grad-text palette (blue → violet → red); dark mode dims them.
export function WaveBackground() {
  const { dark } = useApp();
  const o = dark ? 0.35 : 1;
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wave-blue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2E6BE6" stopOpacity={0.16 * o} />
            <stop offset="70%" stopColor="#2E6BE6" stopOpacity={0.12 * o} />
            <stop offset="100%" stopColor="#6C4FE0" stopOpacity={0.06 * o} />
          </linearGradient>
          <linearGradient id="wave-red" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D8354A" stopOpacity={0.15 * o} />
            <stop offset="60%" stopColor="#D8354A" stopOpacity={0.11 * o} />
            <stop offset="100%" stopColor="#6C4FE0" stopOpacity={0.08 * o} />
          </linearGradient>
          <linearGradient id="wave-violet" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6C4FE0" stopOpacity="0" />
            <stop offset="50%" stopColor="#6C4FE0" stopOpacity={0.10 * o} />
            <stop offset="100%" stopColor="#2E6BE6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Top band: thick on the left, tapering as it sweeps right. */}
        <path fill="url(#wave-blue)"
          d="M0 95 C 260 40 520 70 800 150 S 1300 300 1600 160 L 1600 200 C 1320 300 1060 310 760 240 S 240 150 0 285 Z" />
        {/* Bottom band, mirrored. */}
        <path fill="url(#wave-red)"
          d="M0 700 C 300 830 700 830 1050 720 S 1400 560 1600 610 L 1600 700 C 1380 650 1120 690 820 790 S 260 920 0 820 Z" />
        {/* A thin violet thread through the middle ties the two together. */}
        <path fill="none" stroke="url(#wave-violet)" strokeWidth="2"
          d="M0 520 C 320 430 640 600 960 500 S 1400 420 1600 470" />
      </svg>
    </div>
  );
}
