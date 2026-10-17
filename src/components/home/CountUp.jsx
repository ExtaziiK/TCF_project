import { useLayoutEffect, useRef, useState } from "react";

// Counts a landing stat up from 0 the first time it scrolls into view.
// `value` is the already formatted display string ("3 120", "625", "5K+"…):
// only its whole number animates, with the original digit grouping and any
// prefix/suffix kept. Values with decimals stay static.
//
// The first render is the final value, so prerendered HTML and crawlers get
// the real figure; the reset to 0 happens in a layout effect, before the
// browser paints. Skipped under reduced motion and in headless browsers.
const DURATION = 1600;
const NUMBER = /^(\D*?)(\d{1,3}(?:[\s\u00a0\u202f]\d{3})*|\d+)(?![.,]\d)(.*)$/;

function group(n, sep) {
  return sep ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep) : String(n);
}

export function CountUp({ value }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(value);
  const m = NUMBER.exec(String(value));

  useLayoutEffect(() => {
    setShown(value);
    if (!m || typeof window === "undefined" || !window.IntersectionObserver) return;
    if (navigator.webdriver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, pre, num, post] = m;
    const target = Number(num.replace(/\D/g, ""));
    const sep = (num.match(/[\s\u00a0\u202f]/) || [""])[0];
    if (!target || /\d/.test(post)) return; // e.g. "1 234,5": not a plain whole number
    const render = (n) => `${pre}${group(n, sep)}${post}`;
    setShown(render(0));
    let frame = 0;
    const io = new window.IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = window.performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / DURATION);
        setShown(render(Math.round(target * (1 - Math.pow(1 - p, 3)))));
        if (p < 1) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => { io.disconnect(); window.cancelAnimationFrame(frame); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // tabular-nums keeps the width steady while the digits change.
  return <span ref={ref} className="tabular-nums">{shown}</span>;
}
