import { useCallback, useEffect, useRef, useState } from "react";
import { Quote } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, StarRating } from "@/components/common";

// The landing page's success stories, as a continuously sliding marquee.
//
// Same two-copy trick as the announcement bar (styles/index.css): the track
// holds two identical runs of the cards and translates by exactly -50%, so the
// moment the animation restarts the second copy is sitting where the first
// began and the loop is invisible. Transform-only, so it stays on the GPU.
//
// Three rules it has to keep:
//   · prefers-reduced-motion drops the animation ENTIRELY and falls back to a
//     plain scroll-snap row. The global CSS rule in styles/index.css would stop
//     the slide either way, but a stopped marquee is a clipped one — the cards
//     past the third would simply be unreachable. So the fallback is a real
//     scroller: swipe, trackpad, arrow keys and screen-reader navigation all
//     work with no code from us.
//   · it pauses on hover and on keyboard focus. Nothing should slide out from
//     under someone mid-read, and a card can't be read at a glance while it
//     moves.
//   · the duplicated run is aria-hidden, so assistive tech reads each story
//     once rather than twice.
const SPEED_PX_PER_SEC = 45;  // slow enough to read a card as it passes
const CARD_PX = 340;          // sm+ card width, mirrored in the classes below
const GAP_PX = 20;            // gap-5, applied as a right margin (see below)

export function TestimonialsCarousel({ items }) {
  const { c, t } = useApp();
  const groupRef = useRef(null);
  const [duration, setDuration] = useState(30);
  const [repeat, setRepeat] = useState(1);
  const [reduced, setReduced] = useState(false);

  // Honour the system setting, and keep honouring it if it changes mid-visit.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // A run has to be at least as wide as the viewport, or the -50% jump lands
  // mid-gap and shows a bald patch. With only three or four stories on screen
  // that means repeating the list before duplicating it.
  useEffect(() => {
    if (!items.length) return;
    const sync = () => {
      const run = (CARD_PX + GAP_PX) * items.length;
      setRepeat(Math.max(1, Math.ceil(window.innerWidth / run)));
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [items.length]);

  // Speed is constant in pixels per second, so adding a story makes the loop
  // longer rather than making every card whip past faster.
  const measure = useCallback(() => {
    const width = groupRef.current?.getBoundingClientRect().width;
    if (width) setDuration(Math.max(20, width / SPEED_PX_PER_SEC));
  }, []);

  useEffect(() => {
    measure();
    const el = groupRef.current;
    if (!el || typeof window.ResizeObserver === "undefined") return;
    const ro = new window.ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, repeat, reduced]);

  // Margin rather than `gap`, deliberately: gap would sit *between* the two
  // runs as well, making one run's share of the track slightly wider than the
  // other and knocking the -50% loop point off by half a gap.
  const card = (tm, key, extra = "") => (
    <div key={key} className={`shrink-0 w-[290px] sm:w-[340px] mr-5 ${extra}`}>
      <Card lift className="p-6 h-full flex flex-col">
        {tm.rating ? (
          <StarRating value={tm.rating} size={16} />
        ) : (
          <Quote size={22} className="text-blue-600/40" aria-hidden="true" />
        )}
        <p className={`mt-4 text-sm leading-relaxed flex-1 ${c.text}`}>« {t(tm.body)} »</p>
        <div className="mt-6 flex items-center gap-3">
          {/* Only the stand-in label is translated — a real name is a
              name, in any language. */}
          <span className="w-10 h-10 rounded-full grad-brand text-white text-sm font-bold flex items-center justify-center">{(tm.anonymous ? t(tm.name) : tm.name)[0]}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${c.text}`}>{tm.anonymous ? t(tm.name) : tm.name}</p>
            {tm.origin && <p className={`text-xs ${c.faint}`}>{tm.origin}</p>}
          </div>
          {tm.level && <Pill tone="green">{t(tm.level)}</Pill>}
        </div>
      </Card>
    </div>
  );

  const region = {
    role: "region",
    "aria-roledescription": t("carrousel"),
    "aria-label": t("Histoires de réussite"),
  };

  // Reduced motion: a scroller, not a clipped marquee.
  if (reduced) {
    return (
      <div {...region}>
        <div
          tabIndex={0}
          className="flex items-stretch overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((tm) => card(tm, tm.id, "snap-start"))}
        </div>
      </div>
    );
  }

  // One run of the cards. Rendered twice; the copy is hidden from assistive
  // tech so each story is announced once.
  const run = (hidden) => (
    <div
      ref={hidden ? undefined : groupRef}
      className="marquee-group marquee-cards"
      aria-hidden={hidden ? "true" : undefined}
    >
      {Array.from({ length: repeat }).flatMap((_, r) =>
        items.map((tm) => card(tm, `${hidden ? "b" : "a"}-${r}-${tm.id}`))
      )}
    </div>
  );

  return (
    <div {...region} className="marquee-hover-pause marquee-fade overflow-hidden -my-2 py-2">
      <div className="marquee-track" style={{ "--marquee-duration": `${duration}s` }}>
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}
