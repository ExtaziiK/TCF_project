import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WHY_HERO } from "@/constants/home";

// "Pourquoi nous choisir ?" on one line in the landing hero: the title, then a
// one-line slot where the arguments scroll up one after the other. The first
// argument is repeated at the end of the column so the last one scrolls into
// it seamlessly; the column then snaps back to the top with the transition
// off. Under reduced motion it still cycles, just without the slide.
const HOLD_MS = 2600;
const ROW = "2rem"; // one argument's height — the slot shows exactly one

export function WhyTicker() {
  const { c, t } = useApp();
  const [i, setI] = useState(0);
  const [animate, setAnimate] = useState(true);
  const items = [...WHY_HERO, WHY_HERO[0]];

  useEffect(() => {
    const id = window.setInterval(() => { setAnimate(true); setI((k) => k + 1); }, HOLD_MS);
    return () => window.clearInterval(id);
  }, []);
  // On the repeated first argument, jump back to the real one, unseen.
  const onEnd = () => { if (i >= WHY_HERO.length) { setAnimate(false); setI(0); } };
  useEffect(() => {
    // Without a transition (reduced motion) there is no transitionend: wrap here.
    if (i >= WHY_HERO.length && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setAnimate(false); setI(0); }
  }, [i]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      <h2 className={`font-display font-bold text-lg md:text-xl ${c.text}`}>{t("Pourquoi nous choisir ?")}</h2>
      <div className="relative overflow-hidden" style={{ height: ROW }} aria-live="polite">
        <ul onTransitionEnd={onEnd}
          className={animate ? "transition-transform duration-500 ease-out" : ""}
          style={{ transform: `translateY(calc(-${i} * ${ROW}))` }}>
          {items.map((w, k) => (
            <li key={k} className="flex items-center gap-2.5 whitespace-nowrap" style={{ height: ROW }}
              aria-hidden={k !== i ? "true" : undefined}>
              <w.icon size={18} className={`shrink-0 ${c.sub}`} aria-hidden="true" />
              <span className={`font-display font-bold ${c.text}`}>{t(w.t)}</span>
              <span className={`hidden sm:inline text-sm ${c.sub}`}>— {t(w.d)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
