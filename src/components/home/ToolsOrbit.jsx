import { useEffect, useRef, useState } from "react";
import { ArrowRight, ClipboardCheck, Pointer } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { RouteLink } from "@/components/common";
import { pathForRoute } from "@/constants/seo";
import { PALETTE, HUB, TOOLS, PREVIEWS } from "./toolsData";

// Alternative layout, not currently on the landing page (see ToolsShowcase);
// kept so it can be switched back by swapping the import in Home.jsx.
//
// "7 outils à votre disposition", as an orbit: the TCF blanc sits at the
// centre (the full exam everything builds towards) and the seven tools circle
// it on a dashed ring, each linked to the hub by a spoke. Hovering (or
// focusing) a tool lights its spoke and turns the hub into that tool's card —
// its colour, number, description and a small live preview of the tool.
// Leaving the orbit brings the TCF blanc back.
//
// Below `lg` there is no room for a ring (and no hover on touch screens), so
// the same hub becomes a card above a grid of tool buttons. On touch, the
// first tap on a tool shows its card and a second tap opens it. Every tool is
// a real <a href>, so crawlers and keyboard users reach each module.

// ── Hub content ──────────────────────────────────────────────────────────────

function ToolCard({ tool, n }) {
  const { t, dark, c } = useApp();
  const [, ink, soft] = PALETTE[tool.tone][dark ? "dark" : "light"];
  const night = tool.tone === "night";
  const Preview = PREVIEWS[tool.preview];
  return (
    <div className="rise flex flex-col items-center text-center gap-3 w-full">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center w-9 h-9 rounded-xl" style={{ background: ink, color: night ? "#14204A" : "#FFFFFF" }}>
          <tool.icon size={17} />
        </span>
        <span className="font-mono2 text-xs font-bold" style={{ color: ink }}>{String(n).padStart(2, "0")}</span>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: soft, color: night ? "#FFFFFF" : ink }}>{t(tool.kind)}</span>
      </div>
      <h3 className={`font-display font-extrabold text-xl leading-tight ${night ? "text-white" : c.text}`}>{t(tool.t)}</h3>
      <p className={`text-sm leading-relaxed line-clamp-3 ${night ? "text-white/75" : c.sub}`}>{t(tool.d)}</p>
      <Preview ink={ink} soft={soft} />
      <RouteLink r={tool.route} className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline" style={{ color: ink }}>
        {t("Ouvrir l'outil")} <ArrowRight size={15} />
      </RouteLink>
    </div>
  );
}

function MockCard({ hint }) {
  const { t, dark } = useApp();
  const [, accent] = HUB[dark ? "dark" : "light"];
  return (
    <div className="rise flex flex-col items-center text-center gap-3 w-full text-white">
      <span className="grid place-items-center w-14 h-14 rounded-2xl" style={{ background: accent, color: "#14204A" }}>
        <ClipboardCheck size={26} />
      </span>
      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/15">{t("Au cœur de la préparation")}</span>
      <h3 className="font-display font-extrabold text-3xl">{t("TCF blanc")}</h3>
      <p className="text-sm leading-relaxed text-white/85">
        {t("Les quatre épreuves enchaînées en conditions réelles : minutées, notées sur 699 et converties en NCLC.")}
      </p>
      <RouteLink r="mocks" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition hover:brightness-105"
        style={{ background: accent, color: "#14204A" }}>
        {t("Passer un TCF blanc")} <ArrowRight size={15} />
      </RouteLink>
      <p className="text-xs text-white/70">{t(hint)}</p>
    </div>
  );
}

// ── Tool buttons ─────────────────────────────────────────────────────────────

// A tool's round button. Mouse hover or keyboard focus previews it in the hub
// and a click opens it. Touch only previews on the first tap (pointerenter from
// a finger is ignored, so the tap's click sees the tool inactive) and opens it
// on the second.
// On the ring (`label` = "above" | "below") the name is positioned around the
// circle without taking space, so the button can be centred on its point; in
// the stacked grid it flows under the circle.
function ToolButton({ tool, i, active, setActive, demo, size = 84, label, className = "", style }) {
  const { t, dark, nav } = useApp();
  const [bg, ink] = PALETTE[tool.tone][dark ? "dark" : "light"];
  const on = active === i;
  const onClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    // A tool the demo is showing still needs a real first tap before opening.
    if (!on || demo) setActive(i);
    else nav(tool.route);
  };
  return (
    <a href={pathForRoute(tool.route)} onClick={onClick} onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)} onFocus={(e) => e.currentTarget.matches(":focus-visible") && setActive(i)}
      className={`group flex flex-col items-center gap-2 outline-none ${label ? "-translate-x-1/2 -translate-y-1/2" : ""} ${className}`} style={style}>
      <span className="relative">
        {/* Until the visitor interacts: a pulsing ring invites a hover, and the
            tool the demo is showing gets a tapping hand. */}
        {demo && <span aria-hidden="true" className="invite-ping absolute inset-0 rounded-full border-2" style={{ borderColor: ink, animationDelay: `${i * 0.35}s` }} />}
        <span className={`relative grid place-items-center rounded-full border-2 transition duration-300 ${on ? "scale-110" : "group-hover:scale-105"}`}
          style={{ width: size, height: size, background: on ? ink : bg, borderColor: ink,
            color: on ? (tool.tone === "night" ? "#14204A" : "#FFFFFF") : ink, boxShadow: on ? `0 0 0 6px ${bg}` : "none" }}>
          <tool.icon size={Math.round(size * 0.34)} />
        </span>
        {demo && on && (
          <span aria-hidden="true" className="demo-tap absolute -right-3 -bottom-3 text-slate-900">
            <Pointer size={Math.round(size * 0.36)} fill="#FFFFFF" strokeWidth={1.8} />
          </span>
        )}
      </span>
      <span className={`w-28 text-center text-xs font-bold leading-tight group-focus-visible:underline ${label ? `absolute left-1/2 -translate-x-1/2 ${label === "above" ? "bottom-full mb-3" : "top-full mt-3"}` : ""}`}
        style={{ color: ink }}>{t(tool.t)}</span>
    </a>
  );
}

// ── Layouts ──────────────────────────────────────────────────────────────────

const SIZE = 720; // orbit box (px)
const RING = 290; // ring radius
const HUB_R = 200; // hub radius
const NODE_R = 42; // tool button radius on the ring

function Orbit({ active, setActive, leave, demo }) {
  const { dark } = useApp();
  const tool = active === null ? null : TOOLS[active];
  const [hubBg] = tool ? PALETTE[tool.tone][dark ? "dark" : "light"] : HUB[dark ? "dark" : "light"];
  const line = dark ? "#334155" : "#CBD5E1";
  const pts = TOOLS.map((_, i) => {
    const a = (-90 + (i * 360) / TOOLS.length) * (Math.PI / 180);
    return { x: SIZE / 2 + RING * Math.cos(a), y: SIZE / 2 + RING * Math.sin(a), a };
  });
  return (
    <div className="relative mx-auto hidden lg:block" style={{ width: SIZE, height: SIZE }} onMouseLeave={leave}>
      <svg className="absolute inset-0" width={SIZE} height={SIZE} aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RING} fill="none" stroke={line} strokeWidth="2" strokeDasharray="3 10"
          strokeLinecap="round" className="decor-dash" />
        {pts.map((p, i) => {
          const on = active === i;
          const [, ink] = PALETTE[TOOLS[i].tone][dark ? "dark" : "light"];
          return (
            <line key={i} x1={SIZE / 2 + HUB_R * Math.cos(p.a)} y1={SIZE / 2 + HUB_R * Math.sin(p.a)}
              x2={p.x - (NODE_R + 4) * Math.cos(p.a)} y2={p.y - (NODE_R + 4) * Math.sin(p.a)}
              stroke={on ? ink : line} strokeWidth={on ? 3 : 1.5} strokeDasharray={on ? "none" : "2 6"} strokeLinecap="round" />
          );
        })}
      </svg>
      <div className="absolute rounded-full grid place-items-center transition-colors duration-300"
        style={{ width: HUB_R * 2, height: HUB_R * 2, left: SIZE / 2 - HUB_R, top: SIZE / 2 - HUB_R, background: hubBg }}>
        <div className="w-[272px]">
          {tool ? <ToolCard key={tool.route} tool={tool} n={active + 1} /> : <MockCard key="mock" hint="Survolez un outil pour le découvrir" />}
        </div>
      </div>
      {TOOLS.map((tl, i) => (
        <ToolButton key={tl.route} tool={tl} i={i} active={active} setActive={setActive} demo={demo}
          label={Math.sin(pts[i].a) < -0.2 ? "above" : "below"} className="absolute" style={{ left: pts[i].x, top: pts[i].y }} />
      ))}
    </div>
  );
}

function Stacked({ active, setActive, demo }) {
  const { dark } = useApp();
  const tool = active === null ? null : TOOLS[active];
  const [hubBg] = tool ? PALETTE[tool.tone][dark ? "dark" : "light"] : HUB[dark ? "dark" : "light"];
  return (
    <div className="lg:hidden">
      <div className="mx-auto max-w-md rounded-[32px] p-7 min-h-[360px] grid place-items-center transition-colors duration-300" style={{ background: hubBg }}>
        {tool ? <ToolCard key={tool.route} tool={tool} n={active + 1} /> : <MockCard key="mock" hint="Touchez un outil pour le découvrir" />}
      </div>
      <div className="mt-8 grid grid-cols-4 sm:grid-cols-7 gap-y-6 justify-items-center">
        {TOOLS.map((tl, i) => <ToolButton key={tl.route} tool={tl} i={i} active={active} setActive={setActive} demo={demo} size={60} />)}
      </div>
    </div>
  );
}

// The demo: until the visitor touches anything, the orbit walks through the
// tools on its own once it's on screen (TCF blanc, then each tool in turn), so
// it's obvious the tools respond. The first hover, focus or tap ends it for
// good. Not run under reduced motion.
const DEMO_STEP_MS = 2600;
const DEMO = [null, ...TOOLS.map((_, i) => i)];

function useDemo(ref, stopped) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (stopped || typeof window === "undefined" || !window.IntersectionObserver) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const io = new window.IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setStep((s) => (s + 1) % DEMO.length), DEMO_STEP_MS);
    }, { threshold: 0.35 });
    io.observe(ref.current);
    return () => { io.disconnect(); window.clearInterval(timer); };
  }, [ref, stopped]);
  return DEMO[step];
}

export function ToolsOrbit() {
  const { t } = useApp();
  const ref = useRef(null);
  const [active, setActive] = useState(null);
  const [touched, setTouched] = useState(false);
  const demoActive = useDemo(ref, touched);
  const choose = (i) => { setTouched(true); setActive(i); };
  const shown = touched ? active : demoActive;
  const demo = !touched;
  return (
    <div ref={ref}>
      {/* An explicit invitation. Once the visitor has tried it, it fades out
          but keeps its space, so the orbit below doesn't jump. */}
      <div className={`flex justify-center mb-8 lg:mb-14 transition-opacity duration-500 ${demo ? "" : "opacity-0 pointer-events-none"}`} aria-hidden={!demo}>
        <span className="decor-float inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
          style={{ background: "#FDEFD6", color: "#8A5A0B" }}>
          <Pointer size={16} />
          <span className="hidden lg:inline">{t("Survolez un outil pour le découvrir")}</span>
          <span className="lg:hidden">{t("Touchez un outil pour le découvrir")}</span>
        </span>
      </div>
      <Orbit active={shown} setActive={choose} leave={() => setActive(null)} demo={demo} />
      <Stacked active={shown} setActive={choose} demo={demo} />
    </div>
  );
}
