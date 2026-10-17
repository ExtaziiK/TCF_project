import { useEffect, useRef, useState } from "react";
import { ArrowRight, ClipboardCheck, Pointer, Headphones, BookOpen, PenLine, Mic, Keyboard, Languages, GraduationCap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { RouteLink } from "@/components/common";
import { pathForRoute } from "@/constants/seo";

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

const PALETTE = {
  blue: { light: ["#E3ECFD", "#2E6BE6", "#C7D8FC"], dark: ["#12224A", "#7FA6F5", "#1C3570"] },
  rose: { light: ["#FCE7EC", "#D8354A", "#F9CDD6"], dark: ["#3A1626", "#F08A9B", "#5A2134"] },
  violet: { light: ["#ECE8FD", "#6C4FE0", "#D9D0FC"], dark: ["#1E1A4D", "#A895F7", "#33297A"] },
  amber: { light: ["#FDF0D9", "#B7700F", "#FBDFAE"], dark: ["#3A2A0E", "#F5C26B", "#5C4214"] },
  mint: { light: ["#DDF3EA", "#0F8A5F", "#BDE8D6"], dark: ["#0E3A2C", "#5FD3A6", "#155440"] },
  night: { light: ["#14204A", "#F5A524", "#23336B"], dark: ["#1B2C66", "#F5C26B", "#2A3E85"] },
};

// The hub's own look when it shows the TCF blanc.
const HUB = { light: ["#2E6BE6", "#F5A524", "#4A80EC"], dark: ["#2856B8", "#F5C26B", "#3A68C9"] };

const TOOLS = [
  { route: "listening", icon: Headphones, tone: "blue", kind: "Épreuve officielle", t: "Compréhension orale",
    d: "Des audios aux accents québécois et français, diffusés une seule fois comme le jour de l'examen, corrigés instantanément.", preview: "wave" },
  { route: "reading", icon: BookOpen, tone: "rose", kind: "Épreuve officielle", t: "Compréhension écrite",
    d: "Textes authentiques, surlignage interactif et explications détaillées.", preview: "text" },
  { route: "writing", icon: PenLine, tone: "violet", kind: "Épreuve officielle", t: "Expression écrite",
    d: "Éditeur avec compteur de mots, exemples de réponses et analyse IA.", preview: "count" },
  { route: "speaking", icon: Mic, tone: "amber", kind: "Épreuve officielle", t: "Expression orale",
    d: "Enregistrez-vous, réécoutez-vous et suivez vos progrès tâche par tâche.", preview: "rec" },
  { route: "dictee", icon: Keyboard, tone: "night", kind: "Premium", t: "La dictée",
    d: "Écoutez un corrigé de niveau C1 ou C2 et écrivez-le mot à mot : chaque écart est corrigé, avec sa raison.", preview: "dictee" },
  { route: "vocabulary", icon: Languages, tone: "mint", kind: "Entraînement", t: "Vocabulaire ciblé",
    d: "Cartes mémoire par thème : immigration, travail, vie quotidienne.", preview: "cards" },
  { route: "grammar", icon: GraduationCap, tone: "rose", kind: "Entraînement", t: "Grammaire structurée",
    d: "Leçons courtes suivies d'exercices, des articles aux connecteurs.", preview: "chips" },
];

// ── Mini previews ────────────────────────────────────────────────────────────

function Wave({ ink, soft }) {
  const bars = [40, 70, 55, 90, 35, 80, 60, 95, 45, 75, 50, 85, 30, 65, 88, 42, 72, 58];
  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-14">
        {bars.map((h, i) => (
          <span key={i} className="eqbar flex-1 rounded-full" aria-hidden="true"
            style={{ height: `${h}%`, background: i < 8 ? ink : soft, animationDelay: `${(i % 8) * -0.13}s` }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono2 text-xs font-semibold" style={{ color: ink }}>
        <span>01:12</span><span>1 écoute</span>
      </div>
    </div>
  );
}

function TextLines({ ink, soft }) {
  return (
    <div className="w-full space-y-2" aria-hidden="true">
      <div className="h-2 rounded-full w-full" style={{ background: soft }} />
      <div className="flex gap-1.5">
        <div className="h-2 rounded-full w-1/4" style={{ background: soft }} />
        <div className="h-2 rounded-full w-2/5" style={{ background: ink }} />
        <div className="h-2 rounded-full flex-1" style={{ background: soft }} />
      </div>
      <div className="h-2 rounded-full w-3/4" style={{ background: soft }} />
    </div>
  );
}

function WordCount({ ink, soft }) {
  return (
    <div className="w-full" aria-hidden="true">
      <div className="flex justify-between font-mono2 text-xs font-semibold" style={{ color: ink }}>
        <span>142 / 120 mots</span><span>✓</span>
      </div>
      <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: soft }}>
        <div className="h-full w-full rounded-full" style={{ background: ink }} />
      </div>
    </div>
  );
}

function Recording({ ink, soft }) {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      <span className="relative grid place-items-center w-14 h-14 rounded-full" style={{ background: soft, color: ink }}>
        <Mic size={22} />
        <span className="rec-dot absolute top-1 right-1 w-3 h-3 rounded-full" style={{ background: "#D8354A" }} />
      </span>
      <span className="font-mono2 text-2xl font-bold tabular-nums" style={{ color: ink }}>02:14</span>
    </div>
  );
}

function Dictee({ ink, soft }) {
  return (
    <div className="w-full rounded-2xl px-4 py-3 font-mono2 text-sm text-white/90 leading-relaxed text-left" style={{ background: soft }} aria-hidden="true">
      Le français qui vous ouvre <span className="line-through decoration-2 text-white/50" style={{ textDecorationColor: "#F08A9B" }}>le Canadas</span>{" "}
      <span className="font-bold" style={{ color: ink }}>le Canada</span>
      <span className="caret-blink inline-block w-[2px] h-[1.1em] align-[-0.2em] ml-0.5 bg-white" />
    </div>
  );
}

function Cards({ ink, soft }) {
  return (
    <div className="relative w-full h-16" aria-hidden="true">
      <div className="absolute inset-x-6 top-0 h-12 rounded-xl rotate-[-4deg]" style={{ background: soft }} />
      <div className="absolute inset-x-2 top-2 h-12 rounded-xl grid place-items-center font-display font-bold text-sm bg-white"
        style={{ color: ink, boxShadow: `0 0 0 2px ${ink}` }}>
        le permis de travail
      </div>
    </div>
  );
}

function Chips({ ink, soft }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5" aria-hidden="true">
      {["subjonctif", "connecteurs", "articles"].map((x, i) => (
        <span key={x} className="px-2.5 py-1 rounded-full text-xs font-bold"
          style={i === 0 ? { background: ink, color: "#FFFFFF" } : { background: soft, color: ink }}>{x}</span>
      ))}
    </div>
  );
}

const PREVIEWS = { wave: Wave, text: TextLines, count: WordCount, rec: Recording, dictee: Dictee, cards: Cards, chips: Chips };

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
function ToolButton({ tool, i, active, setActive, demo, size = 84, className = "", style }) {
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
      className={`group flex flex-col items-center gap-2 outline-none ${className}`} style={style}>
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
      <span className="w-28 text-center text-xs font-bold leading-tight group-focus-visible:underline" style={{ color: ink }}>{t(tool.t)}</span>
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
          className="absolute -translate-x-1/2" style={{ left: pts[i].x, top: pts[i].y - NODE_R }} />
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
      {/* An explicit invitation, gone once the visitor has tried it. */}
      {demo && (
        <div className="flex justify-center mb-8">
          <span className="decor-float inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{ background: "#FDEFD6", color: "#8A5A0B" }}>
            <Pointer size={16} />
            <span className="hidden lg:inline">{t("Survolez un outil pour le découvrir")}</span>
            <span className="lg:hidden">{t("Touchez un outil pour le découvrir")}</span>
          </span>
        </div>
      )}
      <Orbit active={shown} setActive={choose} leave={() => setActive(null)} demo={demo} />
      <Stacked active={shown} setActive={choose} demo={demo} />
    </div>
  );
}
