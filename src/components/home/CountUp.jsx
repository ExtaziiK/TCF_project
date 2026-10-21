import { useLayoutEffect, useRef, useState } from "react";

// Counts a landing stat up from 0 as soon as it mounts — the band sits in the
// hero, so it is on screen from the first frame and waiting for it to scroll
// into view only delayed the count. `value` is the already formatted display
// string ("3 120", "625", "5K+"…): only its whole number animates, with the
// original digit grouping and any prefix/suffix kept. Values with decimals
// stay static.
//
// When `value` changes mid-count (the live figure replacing the cached one),
// the count carries on from the number on screen to the new target instead of
// starting over from 0.
//
// The first render is the final value, so prerendered HTML and crawlers get
// the real figure; the reset to 0 happens in a layout effect, before the
// browser paints. Skipped under reduced motion and in headless browsers.
const DURATION = 1600;
const NUMBER = /^(\D*?)(\d{1,3}(?:\s\d{3})*|\d+)(?![.,]\d)(.*)$/;

function group(n, sep) {
  return sep ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep) : String(n);
}

export function CountUp({ value }) {
  const [shown, setShown] = useState(value);
  const onScreen = useRef(0); // the number currently displayed by the count

  useLayoutEffect(() => {
    setShown(value);
    const m = NUMBER.exec(String(value));
    if (!m || typeof window === "undefined") return;
    if (navigator.webdriver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, pre, num, post] = m;
    const target = Number(num.replace(/\D/g, ""));
    const sep = (num.match(/\s/) || [""])[0];
    if (!target || /\d/.test(post)) return; // e.g. "1 234,5": not a plain whole number
    const render = (n) => `${pre}${group(n, sep)}${post}`;
    const from = onScreen.current;
    setShown(render(from));
    const start = window.performance.now();
    let frame = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / DURATION);
      const n = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      onScreen.current = n;
      setShown(render(n));
      if (p < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  // tabular-nums keeps the width steady while the digits change.
  return <span className="tabular-nums">{shown}</span>;
}
