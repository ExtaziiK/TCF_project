import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Plane, MousePointerClick } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { RouteLink } from "@/components/common";
import { pathForRoute } from "@/constants/seo";
import { TINT } from "@/components/decor/WaveSection";
import { DemoQuestion } from "@/components/home/DemoQuestion";
import { DemoQuestionCE } from "@/components/home/DemoQuestionCE";
import { DicteeDemo, VocabDemo, GrammarDemo } from "@/components/home/ToolDemos";
import { MOCKS } from "@/components/home/ToolMocks";
import { PALETTE, TOOLS } from "./toolsData";

// "7 outils à votre disposition", as an interactive showcase: the seven tools
// are always listed (so the section can be skimmed at a glance) and a large
// panel shows the selected one — a working demo of the tool in its own colour, with
// a link to open it. The list advances on its own, with a progress bar under
// the selected tool, until the visitor hovers, clicks or focuses a tool; the
// TCF blanc closes the section as a boarding pass.
//
// Below `lg` the same list becomes an accordion: the panel opens right under
// the selected tool. Tools are real <a href> links (first click selects, a
// click on the selected tool opens it), so crawlers and keyboards reach them.
//
// Each panel first plays an animated mock of its tool (ToolMocks.jsx); when
// the visitor presses its "Essayer maintenant" button, it becomes a working demo
// (except the two expression panels, which stay demo-only and whose mock ends
// on the AI's correction), usable
// without an account: the two comprehension panels hold a real question from
// the bank (DemoQuestion / DemoQuestionCE), the other five are the small demos
// in ToolDemos.jsx. A panel stays live once woken.
//
// The earlier orbit layout lives on in ToolsOrbit.jsx.

const STEP_S = 5; // auto-advance interval, seconds

const tone = (tool, dark) => PALETTE[tool.tone][dark ? "dark" : "light"];
const onInk = (tool) => (tool.tone === "night" ? "#14204A" : "#FFFFFF");

// ── Panel screens: every one is a working demo ──────────────────────────────

// The comprehension panels are real bank questions: `embedded` drops their own
// card chrome, since the panel around them already names the épreuve.
const ScreenCO = () => <DemoQuestion embedded />;
const ScreenCE = () => <DemoQuestionCE embedded />;

// Expression écrite / orale have none on purpose: they stay demo-only, and
// their mock plays the AI correction instead.
const DEMOS = { listening: ScreenCO, reading: ScreenCE, dictee: DicteeDemo, vocabulary: VocabDemo, grammar: GrammarDemo };

// The selected tool's panel: kind, title, description, screen, link. Until
// `live`, the screen is the mock, and only its "Essayer maintenant" button
// calls `onLive` — hovering or clicking elsewhere leaves the animation playing.
// `minH` (desktop, preview state only): the height every previewing panel
// shares, the tallest preview's — the screen slot then stretches, its card
// filling the extra room, so a short preview has no gap under it. Unset, the
// panel takes its own height (a live demo, the mobile accordion, and while the
// showcase measures).
function Panel({ tool, n, active = true, live, onLive, minH }) {
  const { t, dark, c } = useApp();
  // The panel itself stays neutral: only its outline carries the tool's colour.
  const [, ink, soft] = tone(tool, dark);
  const Demo = DEMOS[tool.route];
  const Mock = MOCKS[tool.route];
  // Keyed on `active`, the preview remounts each time its tool is selected,
  // so its loop always plays from the start instead of resuming wherever it
  // froze while hidden.
  const fill = "flex-1 flex flex-col";
  return (
    <div className={`rounded-[32px] p-6 md:p-8 flex flex-col gap-5 border-2 transition-colors duration-300 ${c.card}`} style={{ borderColor: ink, minHeight: minH || undefined }}>
      <div key={tool.route} className="rise flex-1 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono2 text-xs font-bold" style={{ color: ink }}>{String(n).padStart(2, "0")} · {t(tool.kind)}</span>
            <h3 className={`mt-1 font-display font-extrabold text-2xl md:text-3xl ${c.text}`}>{t(tool.t)}</h3>
            <p className={`mt-2 text-sm md:text-base leading-relaxed ${c.sub}`}>{t(tool.d)}</p>
          </div>
          <span className="hidden sm:grid place-items-center w-12 h-12 rounded-2xl shrink-0" style={{ background: ink, color: onInk(tool) }}>
            <tool.icon size={22} />
          </span>
        </div>
        {!Demo ? (
          <div aria-hidden="true" className={fill}><Mock key={active ? "on" : "off"} ink={ink} soft={soft} still={!active} /></div>
        ) : live ? (
          <Demo ink={ink} soft={soft} onInk={onInk(tool)} active={active} />
        ) : (
          // The mock is a picture; the button under it is the only way in. It
          // sits below the mock rather than floating over it, where it hid
          // the mock's last lines.
          <div className={fill}>
            <div aria-hidden="true" className={fill}><Mock key={active ? "on" : "off"} ink={ink} soft={soft} still={!active} /></div>
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={onLive} aria-label={`${t("Essayer maintenant")} : ${t(tool.t)}`}
                className="invite-bob inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-opacity hover:opacity-90 outline-none focus-visible:ring-2"
                style={{ background: ink, color: onInk(tool) }}>
                <MousePointerClick size={15} /> {t("Essayer maintenant")}
              </button>
            </div>
          </div>
        )}
        <RouteLink r={tool.route} className="mt-auto self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition hover:gap-3"
          style={{ background: ink, color: onInk(tool) }}>
          {t("Ouvrir l'outil")} <ArrowRight size={16} />
        </RouteLink>
      </div>
    </div>
  );
}

// ── List ─────────────────────────────────────────────────────────────────────

function Item({ tool, i, active, select, auto, running, onDone }) {
  const { t, dark, nav, c } = useApp();
  const [, ink, soft] = tone(tool, dark);
  const on = active === i;
  const onClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (on) nav(tool.route);
    else select(i);
  };
  return (
    <a href={pathForRoute(tool.route)} onClick={onClick}
      onPointerEnter={(e) => e.pointerType === "mouse" && select(i)}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && select(i)}
      aria-current={on ? "true" : undefined}
      className={`group relative block rounded-2xl px-4 py-3 border-2 outline-none transition-colors focus-visible:ring-2 ${c.card} ${on ? "" : `${c.border} hover:bg-slate-500/5`}`}
      style={on ? { borderColor: ink } : undefined}>
      <span className="flex items-center gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0 transition-colors"
          style={on ? { background: ink, color: onInk(tool) } : { background: soft, color: ink }}>
          <tool.icon size={18} />
        </span>
        {/* One line, whatever the state: the badge never comes and goes, so
            selecting an item can't change its height and reflow the list
            under the pointer (which made neighbours swap back and forth). */}
        <span className="flex-1 min-w-0 flex items-center gap-2">
          <span className={`truncate font-display font-bold ${on ? "" : c.text}`} style={on ? { color: ink } : undefined}>{t(tool.t)}</span>
          {tool.kind === "Nouveau" && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "#F5A524", color: "#14204A" }}>
              {t("Nouveau")}
            </span>
          )}
        </span>
        <ArrowRight size={16} className={`shrink-0 transition ${on ? "opacity-100" : "opacity-0 group-hover:opacity-60"}`} style={{ color: ink }} />
      </span>
      {/* Auto-advance progress: fills while this tool is shown, then moves on. */}
      {on && auto && (
        <span className="absolute left-4 right-4 bottom-1.5 h-1 rounded-full overflow-hidden" style={{ background: `${ink}33` }} aria-hidden="true">
          <span className="showcase-progress block h-full rounded-full" onAnimationEnd={onDone}
            style={{ background: ink, animationDuration: `${STEP_S}s`, animationPlayState: running ? "running" : "paused" }} />
        </span>
      )}
    </a>
  );
}

// ── TCF blanc boarding pass ──────────────────────────────────────────────────

// The TCF blanc closes the section as a boarding pass — the passerelle to
// Canada: the exam's facts as ticket fields, the four épreuves as the route,
// and a tear-off stub holding the call to action. Flat colours; the notches
// on the tear line take the page colour so the ticket looks cut out.
const ROUTE = [["CO", "blue", "35 min"], ["CE", "rose", "60 min"], ["EE", "violet", "60 min"], ["EO", "amber", "12 min"]];
const BARCODE = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1];

// `cta`: the stub's button — "Passer un TCF blanc" by default; a visitor's
// pitch page points it at the sign-up instead.
export function MockPass({ tinted, cta = { l: "Passer un TCF blanc", r: "mocks" } }) {
  const { t, dark, c } = useApp();
  const blue = PALETTE.blue[dark ? "dark" : "light"];
  // The section behind the ticket, which the notches have to match.
  const page = tinted ? (dark ? TINT.dark : TINT.light) : dark ? "#020617" : "#FFFFFF";
  const edge = dark ? "#334155" : "#CBD5E1"; // ticket outline
  const field = (label, value) => (
    <div>
      <p className={`font-mono2 text-[10px] font-bold uppercase tracking-widest ${c.faint}`}>{label}</p>
      <p className={`mt-0.5 font-display font-extrabold text-lg ${c.text}`}>{value}</p>
    </div>
  );
  return (
    <div className={`relative mt-10 flex flex-col md:flex-row rounded-[28px] border-2 ${c.card}`} style={{ borderColor: edge }}>
      <div className="flex-1 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono2 text-[11px] font-bold uppercase tracking-widest" style={{ color: blue[1] }}>
            <Plane size={14} /> {t("Carte d'embarquement")}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: blue[2], color: blue[1] }}>
            {t("Au cœur de la préparation")}
          </span>
        </div>
        <h3 className={`mt-3 font-display font-extrabold text-2xl md:text-3xl ${c.text}`}>{t("TCF blanc")}</h3>
        <p className={`mt-1 text-sm md:text-base ${c.sub}`}>{t("Les quatre épreuves enchaînées en conditions réelles : minutées, notées sur 699 et converties en NCLC.")}</p>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {field(t("Épreuves"), "4")}
          {field(t("Durée"), "2 h 47")}
          {field(t("Score"), "/ 699")}
          {field(t("Destination"), "Canada")}
        </div>
        {/* The route: the four épreuves in exam order. */}
        <div className="mt-6 flex items-center" aria-hidden="true">
          {ROUTE.map(([code, toneKey, mins], i) => {
            const [bg, ink] = PALETTE[toneKey][dark ? "dark" : "light"];
            return (
              <div key={code} className="flex items-center flex-1 last:flex-none">
                <span className="flex flex-col items-center">
                  <span className="grid place-items-center w-11 h-11 rounded-full font-display font-extrabold text-xs" style={{ background: bg, color: ink, boxShadow: `0 0 0 2px ${ink}` }}>{code}</span>
                  <span className={`mt-1 font-mono2 text-[10px] font-semibold ${c.faint}`}>{mins}</span>
                </span>
                {i < ROUTE.length - 1 && <span className={`flex-1 mx-2 mb-4 border-t-2 border-dashed ${c.border}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tear line: a dashed rule with a page-coloured notch cut into the
          ticket at each end — horizontal when stacked, vertical from md. Each
          notch is a circle clipped to the half that lies inside the ticket. */}
      <div className="relative h-0 md:h-auto md:w-0" aria-hidden="true">
        <span className={`absolute left-6 right-6 top-0 border-t-2 border-dashed md:hidden ${c.border}`} />
        <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full border-2 md:hidden" style={{ borderColor: edge, background: page, clipPath: "inset(0 0 0 50%)" }} />
        <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full border-2 md:hidden" style={{ borderColor: edge, background: page, clipPath: "inset(0 50% 0 0)" }} />
        <span className={`absolute top-6 bottom-6 left-0 border-l-2 border-dashed hidden md:block ${c.border}`} />
        <span className="absolute -top-3 -left-3 w-6 h-6 rounded-full border-2 hidden md:block" style={{ borderColor: edge, background: page, clipPath: "inset(50% 0 0 0)" }} />
        <span className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full border-2 hidden md:block" style={{ borderColor: edge, background: page, clipPath: "inset(0 0 50% 0)" }} />
      </div>

      <div className="md:w-72 p-6 md:p-8 flex flex-col items-center justify-center gap-4 rounded-b-[28px] md:rounded-bl-none md:rounded-r-[28px]" style={{ background: blue[0] }}>
        <RouteLink r={cta.r} className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold whitespace-nowrap text-white transition hover:gap-3"
          style={{ background: blue[1] }}>
          {t(cta.l)} <ArrowRight size={16} />
        </RouteLink>
        <div className="flex items-stretch gap-[2px] h-12" aria-hidden="true">
          {BARCODE.map((w, i) => <span key={i} style={{ width: w * 2, background: i % 2 ? "transparent" : (dark ? "#CBD5E1" : "#1E293B") }} />)}
        </div>
        <p className={`font-mono2 text-[10px] font-bold tracking-widest ${c.faint}`}>PSR · TCF · 699</p>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

// `tinted`: the showcase sits on a tinted section (the landing hero), which
// the boarding pass's cut-out notches must match.
const WIDE = "(min-width: 1024px)";
const isWide = () => typeof window !== "undefined" && !!window.matchMedia?.(WIDE).matches;

export function ToolsShowcase({ tinted = false }) {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  // Tools whose panel has been woken from its mock into the working demo.
  const [live, setLive] = useState(() => new Set());
  const goLive = (route) => setLive((s) => (s.has(route) ? s : new Set(s).add(route)));
  // Only one layout is mounted — the accordion below lg, the side panel from
  // lg — because the comprehension panels hold real questions: mounting both
  // would load each audio twice and draw two different random questions.
  const [wide, setWide] = useState(isWide);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(WIDE);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  // Every panel still showing its preview gets the same height on desktop:
  // the tallest preview's. Measured with no height applied (so the panels
  // report their natural size), then applied; redone whenever the showcase's
  // width changes, since the text wraps differently. Panels already turned
  // into a live demo are left out and keep their own height.
  const panelRefs = useRef([]);
  const [mockH, setMockH] = useState(null);
  const [measureKey, setMeasureKey] = useState(0);
  useEffect(() => {
    if (!wide || !ref.current || typeof window.ResizeObserver === "undefined") return undefined;
    let width = 0;
    const ro = new window.ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w !== width) { width = w; setMeasureKey((k) => k + 1); }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [wide]);
  // The display font arriving after the first measure changes every height.
  useEffect(() => { document.fonts?.ready.then(() => setMeasureKey((k) => k + 1)); }, []);
  useEffect(() => { setMockH(null); }, [measureKey, live]);
  useLayoutEffect(() => {
    if (!wide || mockH !== null) return;
    const heights = TOOLS.map((tl, i) => (live.has(tl.route) ? 0 : panelRefs.current[i]?.offsetHeight || 0));
    const max = Math.max(...heights);
    if (max > 0) setMockH(max);
  }, [wide, mockH, live]);
  // The comprehension panels stay mounted while hidden (so an answer survives
  // a look at another tool), so a clip still playing is paused on switch.
  useEffect(() => {
    ref.current?.querySelectorAll("audio").forEach((a) => a.pause());
  }, [active]);
  const [auto, setAuto] = useState(true); // until the first interaction (desktop only)
  const [visible, setVisible] = useState(false);

  // The progress bar (and so the auto-advance) only runs while the section is
  // on screen. Under reduced motion the bar's animation is disabled globally,
  // so it never ends and the list simply stays put.
  useEffect(() => {
    if (typeof window === "undefined" || !window.IntersectionObserver) return;
    // On small screens the list is an accordion: advancing would open panel
    // after panel and shift the page while the visitor scrolls, so it stays put.
    if (!window.matchMedia(WIDE).matches) setAuto(false);
    const io = new window.IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const select = (i) => { setAuto(false); setActive(i); };
  const next = () => setActive((i) => (i + 1) % TOOLS.length);

  return (
    <div ref={ref}>
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-10 items-start">
        <nav aria-label="Outils" className="flex flex-col gap-1.5">
          {TOOLS.map((tl, i) => (
            <div key={tl.route}>
              <Item tool={tl} i={i} active={active} select={select} auto={auto} running={visible} onDone={next} />
              {/* Accordion on small screens: the panel opens under its tool. */}
              {!wide && active === i && <div className="mt-3 mb-2"><Panel tool={tl} n={i + 1} live={live.has(tl.route)} onLive={() => goLive(tl.route)} /></div>}
            </div>
          ))}
        </nav>
        {/* Only the selected panel is in the flow, so the card is exactly as
            tall as its own content (sharing one grid cell made every panel as
            tall as the tallest, leaving short ones with a gap at the bottom).
            The others stay mounted out of the flow, so work in progress (an
            answer, a text, a recording) survives a look at another tool;
            `active` tells each demo to fall silent. They also drop their
            transitions: an inherited `visibility` change is animatable, so a
            `transition-all` inside (the CE document's box) kept that panel
            showing over the next one for a moment.
            Reaching into the panel stops the auto-advance, so it never
            switches away mid-question. */}
        {wide && (
        {/* The panel column is drawn at a zoom of 0.8: it keeps its full width
            (an auto width is not scaled), its contents shrink, and with longer
            lines the card comes out about 20 % shorter than at full size. The
            heights measured above are taken inside it, so the shared height
            follows. */}
        <div className="relative [zoom:0.8]" onPointerEnter={() => setAuto(false)} onFocusCapture={() => setAuto(false)}>
          {TOOLS.map((tl, i) => {
            const on = i === active;
            return (
              <div key={tl.route} ref={(el) => { panelRefs.current[i] = el; }}
                className={on ? "" : "invisible absolute inset-x-0 top-0 [&_*]:!transition-none"} aria-hidden={on ? undefined : "true"}>
                <Panel tool={tl} n={i + 1} active={on} live={live.has(tl.route)} onLive={() => goLive(tl.route)}
                  minH={live.has(tl.route) ? null : mockH} />
              </div>
            );
          })}
        </div>
        )}
      </div>
      <MockPass tinted={tinted} />
    </div>
  );
}
