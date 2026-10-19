import { useEffect, useState } from "react";

// Airport departures-board lettering for the calculator's control tower: each
// cell riffles through a few random characters before landing on its own, the
// way a real split-flap board settles. Purely decorative motion — the text is
// also given whole to screen readers (aria-label), and under
// prefers-reduced-motion the cells switch straight to the final character.

const RIFFLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function FlapCell({ ch, tone }) {
  const [shown, setShown] = useState(ch);
  const [tick, setTick] = useState(0); // remounts the glyph so each flip animates

  useEffect(() => {
    if (ch === shown) return undefined;
    if (reducedMotion()) { setShown(ch); return undefined; }
    let n = 0;
    const steps = 3 + Math.floor(Math.random() * 5);
    const id = window.setInterval(() => {
      n += 1;
      setShown(n >= steps ? ch : RIFFLE[Math.floor(Math.random() * RIFFLE.length)]);
      setTick((k) => k + 1);
      if (n >= steps) window.clearInterval(id);
    }, 55);
    return () => window.clearInterval(id);
    // `shown` is what the riffle writes; re-running on it would restart the riffle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch]);

  return (
    <span className="flap-cell" style={tone ? { color: tone } : undefined}>
      <span key={tick} className="flap-ch">{shown === " " ? " " : shown}</span>
    </span>
  );
}

// `text` is padded (or cut) to `length` cells, so the board keeps its width
// while the message changes.
export function SplitFlap({ text, length, tone, className = "", label }) {
  const cells = String(text).toUpperCase().padEnd(length, " ").slice(0, length).split("");
  return (
    <span className={`flap ${className}`} role="img" aria-label={label ?? String(text)}>
      {cells.map((ch, i) => <FlapCell key={i} ch={ch} tone={tone} />)}
    </span>
  );
}
