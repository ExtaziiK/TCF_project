import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { TOUR_STEPS } from "@/constants/tour";

// How long to keep looking for a step's target before giving up and falling
// back to a plain centered dim (e.g. the desktop-only "Pratique" dropdown has
// no equivalent single element in the mobile menu's flattened link list).
const POLL_MS = 300;
const MAX_MISSES = 15; // ~4.5s
const GAP = 14; // px between the spotlight and the anchored tooltip
const MARGIN = 16; // px kept clear of the viewport edge
const ARROW = 10; // px, the pointer's square side before its 45° rotation

// Finds every `[data-tour="target"]` and reports the UNION of their viewport
// rects — several steps tag more than one element (e.g. a dropdown's trigger
// AND its opened panel, which are two separate boxes: a `position:relative`
// wrapper's own rect does not grow to include an absolutely-positioned child
// that overflows it), so a single querySelector would spotlight only the
// smaller one and leave the rest sitting in the dimmed area.
// Re-measures on an interval (cheap, and simpler than a MutationObserver
// here) so it follows layout changes the tour itself causes — Nav
// force-opening a dropdown, or the step navigating to a different route.
// Polling, rather than a single measurement, because the element may not
// exist yet the instant a step starts (a dropdown takes a render tick to
// open; a route change takes one to mount the next page).
function useTourTarget(target) {
  const [state, setState] = useState({ rect: null, status: "pending" });
  useEffect(() => {
    setState({ rect: null, status: "pending" });
    if (!target) return undefined;
    let misses = 0;
    const measure = () => {
      const rects = [...document.querySelectorAll(`[data-tour="${target}"]`)]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);
      if (rects.length > 0) {
        const top = Math.min(...rects.map((r) => r.top));
        const left = Math.min(...rects.map((r) => r.left));
        const right = Math.max(...rects.map((r) => r.right));
        const bottom = Math.max(...rects.map((r) => r.bottom));
        const next = { top, left, width: right - left, height: bottom - top };
        // Keeps the same object when nothing actually moved, so a step that
        // has settled doesn't force a re-render (and a placeCard/layout
        // recompute) every single poll tick.
        setState((prev) => (prev.status === "found" && prev.rect
          && prev.rect.top === next.top && prev.rect.left === next.left
          && prev.rect.width === next.width && prev.rect.height === next.height)
          ? prev : { rect: next, status: "found" });
        return;
      }
      misses += 1;
      if (misses > MAX_MISSES) setState({ rect: null, status: "fallback" });
    };
    measure();
    const iv = setInterval(measure, POLL_MS);
    window.addEventListener("resize", measure);
    return () => { clearInterval(iv); window.removeEventListener("resize", measure); };
  }, [target]);
  return state;
}

// Where to anchor the tooltip relative to the spotlight, and which of its
// own edges the pointer arrow sits on. Tries below, above, right, left in
// that order — the first with enough room — because an anchored callout next
// to the thing it explains is the whole point of a spotlight tour; it never
// falls back to centering the tooltip on screen while a spotlight is up.
function placeCard(spot, card) {
  if (!spot || !card.width || !card.height) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max));
  const spaceBelow = vh - (spot.top + spot.height);
  const spaceAbove = spot.top;
  const spaceRight = vw - (spot.left + spot.width);

  let arrowEdge, top, left;
  if (spaceBelow >= card.height + GAP + MARGIN) {
    arrowEdge = "top"; // pointer sits on the card's top edge, pointing up at the spot
    top = spot.top + spot.height + GAP;
    left = clamp(spot.left, MARGIN, vw - card.width - MARGIN);
  } else if (spaceAbove >= card.height + GAP + MARGIN) {
    arrowEdge = "bottom";
    top = spot.top - GAP - card.height;
    left = clamp(spot.left, MARGIN, vw - card.width - MARGIN);
  } else if (spaceRight >= card.width + GAP + MARGIN) {
    arrowEdge = "left";
    top = clamp(spot.top, MARGIN, vh - card.height - MARGIN);
    left = spot.left + spot.width + GAP;
  } else {
    arrowEdge = "right";
    top = clamp(spot.top, MARGIN, vh - card.height - MARGIN);
    left = spot.left - GAP - card.width;
  }
  const inset = 22; // keeps the arrow clear of the card's rounded corners
  const arrowOffset = arrowEdge === "top" || arrowEdge === "bottom"
    ? clamp(spot.left + spot.width / 2 - left, inset, card.width - inset)
    : clamp(spot.top + spot.height / 2 - top, inset, card.height - inset);
  return { top, left, arrowEdge, arrowOffset };
}

// Full-screen spotlight: everything but the target is dimmed via four panels
// framing a hole (rather than one overlay + a CSS mask/clip-path), so the
// target itself is never covered by anything and stays natively clickable.
// The panels still need z-[80] — Nav's header carries its own z-40, and a
// positioned element beats a z-index:auto one regardless of DOM order, so
// without it the nav bar would paint over the dimming meant to cover it.
export function TourOverlay() {
  const { tourStep, nextTourStep, endTour, c, t, user } = useApp();
  const step = tourStep != null ? TOUR_STEPS[tourStep] : null;
  const { rect, status } = useTourTarget(step?.target ?? null);
  const cardRef = useRef(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (tourStep == null) return undefined;
    const onKey = (e) => { if (e.key === "Escape") endTour(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tourStep, endTour]);

  const spot = status === "found" && rect ? {
    top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12,
  } : null;

  // Measured from the real, rendered card (its text wraps differently per
  // step) rather than a guessed constant, so placeCard() never overlaps the
  // viewport edge on a long step. Runs after layout, before paint, so a step
  // change can only ever cost one frame at the previous step's size.
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    setCardSize({ width: r.width, height: r.height });
  }, [step, spot?.top, spot?.left, spot?.width, spot?.height]);

  if (!user || !step) return null;

  const isLast = tourStep === TOUR_STEPS.length - 1;
  const placement = spot ? placeCard(spot, cardSize) : null;
  const dim = "fixed z-[80] bg-slate-950/78";
  const cardCls = `rounded-2xl border ${c.border} ${c.card} shadow-2xl`;

  const card = (
    <div
      ref={cardRef}
      className={`fixed z-[85] w-80 p-5 ${cardCls} ${placement ? "" : "inset-0 m-auto h-fit"}`}
      style={placement ? { top: placement.top, left: placement.left } : { maxWidth: "20rem" }}
    >
      {placement?.arrowEdge && (
        <span
          aria-hidden="true"
          // Sized via inline style, not a `w-[Npx]` class: Tailwind's JIT
          // scans source text for class names, and a runtime-interpolated
          // template literal like `w-[${ARROW}px]` is invisible to it, so
          // that class would silently never make it into the built CSS.
          // Built from the border/background tokens directly rather than
          // reusing `cardCls`, which also carries `rounded-2xl` — Tailwind
          // utilities of equal specificity win by their order in ITS
          // generated stylesheet, not by position in this string, so
          // appending a `rounded-none` here would not reliably beat it and
          // a rounded 10px diamond stops reading as a pointer at all.
          className={`absolute border ${c.border} ${c.card}`}
          style={{
            width: ARROW, height: ARROW,
            ...(placement.arrowEdge === "top" ? { top: -ARROW / 2, left: placement.arrowOffset - ARROW / 2, borderRight: "none", borderBottom: "none" } : {}),
            ...(placement.arrowEdge === "bottom" ? { bottom: -ARROW / 2, left: placement.arrowOffset - ARROW / 2, borderLeft: "none", borderTop: "none" } : {}),
            ...(placement.arrowEdge === "left" ? { left: -ARROW / 2, top: placement.arrowOffset - ARROW / 2, borderTop: "none", borderRight: "none" } : {}),
            ...(placement.arrowEdge === "right" ? { right: -ARROW / 2, top: placement.arrowOffset - ARROW / 2, borderBottom: "none", borderLeft: "none" } : {}),
          }}
        />
      )}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === tourStep ? "w-6 bg-blue-600" : `w-1.5 ${c.track}`}`} />
          ))}
        </div>
        <button onClick={endTour} aria-label={t("Fermer la visite")} className={`p-1 rounded-lg ${c.faint} ${c.hoverSoft}`}><X size={16} /></button>
      </div>
      <h3 className={`font-display font-bold text-lg ${c.text}`}>{t(step.title)}</h3>
      <p className={`text-sm mt-1.5 leading-relaxed ${c.sub}`}>{t(step.body)}</p>
      <div className="flex items-center justify-between gap-3 mt-5">
        <button onClick={endTour} className={`text-sm font-semibold ${c.faint} hover:underline`}>{t("Passer la visite")}</button>
        <Btn small icon={isLast ? undefined : ArrowRight} onClick={isLast ? endTour : nextTourStep}>
          {t(isLast ? "Terminer" : "Suivant")}
        </Btn>
      </div>
    </div>
  );

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("Visite guidée de l'application")}>
      {spot ? (
        <>
          <div className={dim} style={{ top: 0, left: 0, right: 0, height: Math.max(0, spot.top) }} />
          <div className={dim} style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }} />
          <div className={dim} style={{ top: spot.top, left: 0, width: Math.max(0, spot.left), height: spot.height }} />
          <div className={dim} style={{ top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height }} />
        </>
      ) : (
        <div className={`${dim} inset-0`} />
      )}
      {card}
    </div>,
    document.body,
  );
}
