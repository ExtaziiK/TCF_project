// The "please wait" animation: the Passerelle logo forming (the books and the
// bridge, from the intro of the video ads, ads/tour/src/intro.mp4), played at
// 2x — 5 s, 640 px, no sound, 135 KB in public/loader-intro.mp4. It plays once
// and holds on the finished logo if the wait runs longer. Used for a page
// being downloaded (pages/index.jsx) and a quiz image being fetched
// (BankQuestionMedia). With reduced motion: the finished logo, still.
//
// `className` sizes it; `fadeIn` (.loader-in) shows it only after a short
// delay, so a wait that ends at once never flashes it.

const prefersReducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

export function LogoLoader({ className = "", fadeIn = true }) {
  const cls = `${fadeIn ? "loader-in " : ""}h-auto rounded-3xl shadow-xl shadow-black/10 ${className}`;
  if (prefersReducedMotion()) {
    return <img src="/loader-intro-poster.jpg" alt="" width="320" height="180" className={cls} />;
  }
  return (
    <video
      src="/loader-intro.mp4"
      autoPlay
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      width="320"
      height="180"
      className={cls}
    />
  );
}
