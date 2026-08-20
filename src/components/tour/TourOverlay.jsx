import { useEffect, useState } from "react";
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

// Finds every `[data-tour="target"]` and reports the UNION of their viewport
// rects — the "Pratique" step tags both the nav trigger and its opened
// dropdown panel, which are two separate boxes (a `position:relative`
// wrapper's own rect does not grow to include an absolutely-positioned child
// that overflows it), so a single querySelector would spotlight only the
// small trigger and leave the actual menu sitting in the dimmed area.
// Re-measures on an interval (cheap, and simpler than a MutationObserver
// here) so it follows layout changes the tour itself causes — Nav
// force-opening that dropdown, or the step navigating to a different route.
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
        setState({ rect: { top, left, width: right - left, height: bottom - top }, status: "found" });
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

  useEffect(() => {
    if (tourStep == null) return undefined;
    const onKey = (e) => { if (e.key === "Escape") endTour(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tourStep, endTour]);

  if (!user || !step) return null;

  const isLast = tourStep === TOUR_STEPS.length - 1;
  const pad = 8;
  const spot = status === "found" && rect ? {
    top: rect.top - pad, left: rect.left - pad,
    width: rect.width + pad * 2, height: rect.height + pad * 2,
  } : null;
  const dim = "fixed z-[80] bg-slate-950/72 backdrop-blur-[1px]";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("Visite guidée de l'application")}>
      {spot ? (
        <>
          <div className={dim} style={{ top: 0, left: 0, right: 0, height: Math.max(0, spot.top) }} />
          <div className={dim} style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }} />
          <div className={dim} style={{ top: spot.top, left: 0, width: Math.max(0, spot.left), height: spot.height }} />
          <div className={dim} style={{ top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height }} />
          <div className="fixed z-[80] rounded-2xl pointer-events-none ring-4 ring-blue-500" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }} />
        </>
      ) : (
        <div className={`${dim} inset-0`} />
      )}

      {/* Fixed at the top on purpose, not near the spotlight: a consistent
          spot means the explanation never has to dodge the target it's
          pointing at, and it stays clear of Toast (bottom-center, z-50). */}
      <div className={`fixed z-[85] top-20 sm:top-24 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[26rem] rounded-3xl border ${c.border} ${c.card} shadow-2xl p-5 sm:p-6 rise`}>
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
    </div>,
    document.body,
  );
}
