import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";

// The landing page's success stories, as an auto-advancing slideshow.
//
// Built on native scroll-snap rather than a transformed track: the container is
// a real horizontal scroller, so touch swipe, trackpad, arrow keys and a screen
// reader's own navigation all work without a line of code from us. Paging is
// then just scrollTo() on top of something that already worked.
//
// Three rules it has to keep:
//   · prefers-reduced-motion stops the auto-advance ENTIRELY and makes manual
//     paging jump instead of glide. The global CSS rule in styles/index.css
//     kills animations and transitions, but a JS scroll loop is invisible to
//     it — motion that a visitor has asked their system to suppress would
//     otherwise keep running here, which is exactly the failure the setting
//     exists to prevent.
//   · it pauses on hover, on keyboard focus, and while the tab is hidden.
//     Nothing should slide out from under someone mid-read.
//   · every control is a real labelled <button>, and the slides stay reachable
//     and readable if the timer never runs at all.
const INTERVAL_MS = 6000;

export function TestimonialsCarousel({ items }) {
  const { c, t } = useApp();
  const trackRef = useRef(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Honour the system setting, and keep honouring it if it changes mid-visit.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // How many cards fit, measured rather than guessed from a breakpoint, so the
  // dots always match what is actually on screen at any width.
  const measure = useCallback(() => {
    const el = trackRef.current;
    const first = el?.firstElementChild;
    if (!el || !first) return;
    const step = first.getBoundingClientRect().width + 20; // card + gap-5
    const fit = Math.max(1, Math.round(el.clientWidth / step));
    setPages(Math.max(1, Math.ceil(items.length / fit)));
  }, [items.length]);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el || typeof window.ResizeObserver === "undefined") return;
    const ro = new window.ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // Follow manual scrolling (swipe, arrow keys, a dragged scrollbar) so the
  // dots never disagree with what is on screen.
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    setPage(Math.min(pages - 1, Math.max(0, Math.round(el.scrollLeft / width))));
  };

  const goTo = useCallback((p) => {
    const el = trackRef.current;
    if (!el) return;
    const next = ((p % pages) + pages) % pages; // wrap both ways
    el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    setPage(next);
  }, [pages, reduced]);

  // The timer. Never starts when motion is reduced, and stops whenever the tab
  // is in the background so a visitor does not return to a slideshow that has
  // silently run through everything.
  useEffect(() => {
    if (reduced || paused || pages < 2) return;
    const tick = () => { if (!document.hidden) goTo(page + 1); };
    const id = setInterval(tick, INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduced, paused, pages, page, goTo]);

  const hold = () => setPaused(true);
  const release = () => setPaused(false);

  return (
    <div
      role="region"
      aria-roledescription={t("carrousel")}
      aria-label={t("Histoires de réussite")}
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocusCapture={hold}
      onBlurCapture={release}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((tm) => (
          <div key={tm.id} className="snap-start shrink-0 w-[85%] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]">
            <Card lift className="p-6 h-full flex flex-col">
              <Quote size={22} className="text-blue-600/40" aria-hidden="true" />
              <p className={`mt-4 text-sm leading-relaxed flex-1 ${c.text}`}>« {t(tm.body)} »</p>
              <div className="mt-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full grad-brand text-white text-sm font-bold flex items-center justify-center">{tm.name[0]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${c.text}`}>{tm.name}</p>
                  {tm.origin && <p className={`text-xs ${c.faint}`}>{tm.origin}</p>}
                </div>
                {tm.level && <Pill tone="green">{t(tm.level)}</Pill>}
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Controls appear only when there is something to page through — one
          screenful of stories needs no slideshow chrome. */}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button onClick={() => goTo(page - 1)} aria-label={t("Témoignages précédents")}
            className={`w-9 h-9 rounded-full border ${c.border} ${c.sub} ${c.hoverSoft} flex items-center justify-center transition-colors hover:text-blue-600`}>
            <ChevronLeft size={17} />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: pages }).map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                aria-label={t("Aller à la page") + ` ${i + 1}`}
                aria-current={i === page ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${i === page ? "w-6 bg-blue-600" : `w-2 ${c.track} hover:bg-blue-600/40`}`} />
            ))}
          </div>
          <button onClick={() => goTo(page + 1)} aria-label={t("Témoignages suivants")}
            className={`w-9 h-9 rounded-full border ${c.border} ${c.sub} ${c.hoverSoft} flex items-center justify-center transition-colors hover:text-blue-600`}>
            <ChevronRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
