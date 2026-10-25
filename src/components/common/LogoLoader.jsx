// The "please wait" animation: the Passerelle logo forming — the books and
// the bridge from the intro of the video ads (ads/tour/src/intro.mp4) — with
// its studio background removed, so it sits straight on the page in light
// and dark mode. Played at 2x: 5 s, 480 px, transparent VP9 WebM, 240 KB
// (public/loader-intro.webm). It plays once and holds on the finished logo if
// the wait runs longer. A soft brand-gradient glow breathes behind it.
//
// Safari and every iPhone/iPad browser (all WebKit) don't draw the WebM's
// transparency — they would show a black box — so there, and with reduced
// motion, it is the finished logo (public/loader-intro-final.webp, 25 KB)
// popping in instead.
//
// Used while a quiz loads (BankLoading) and while a quiz image loads
// (BankQuestionMedia). `className` sizes it; `fadeIn` shows it only after a
// short delay, so a wait that ends at once never flashes it.

const prefersReducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};
const isWebKitOnly = () => {
  try {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) || /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua);
  } catch { return false; }
};

export function LogoLoader({ className = "", fadeIn = true }) {
  const still = prefersReducedMotion() || isWebKitOnly();
  return (
    <div className={`relative ${fadeIn ? "loader-in " : ""}${className}`}>
      <span aria-hidden="true" className="logo-glow absolute inset-x-[12%] inset-y-[18%] rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 blur-3xl" />
      {still ? (
        <img src="/loader-intro-final.webp" alt="" width="480" height="246" className="logo-pop relative w-full h-auto drop-shadow-[0_10px_24px_rgba(79,70,229,0.25)]" />
      ) : (
        <video
          src="/loader-intro.webm"
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          width="480"
          height="246"
          className="relative w-full h-auto drop-shadow-[0_10px_24px_rgba(79,70,229,0.25)]"
        />
      )}
    </div>
  );
}
