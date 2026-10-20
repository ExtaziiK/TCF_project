import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Play, Mic, Sparkles, Plane, Volume2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { RouteLink } from "@/components/common";
import { pathForRoute } from "@/constants/seo";
import { PALETTE, TOOLS } from "./toolsData";

// "7 outils à votre disposition", as an interactive showcase: the seven tools
// are always listed (so the section can be skimmed at a glance) and a large
// panel shows the selected one — a mock of its screen in its own colour, with
// a link to open it. The list advances on its own, with a progress bar under
// the selected tool, until the visitor hovers, clicks or focuses a tool; the
// TCF blanc closes the section as a boarding pass.
//
// Below `lg` the same list becomes an accordion: the panel opens right under
// the selected tool. Tools are real <a href> links (first click selects, a
// click on the selected tool opens it), so crawlers and keyboards reach them.
//
// The earlier orbit layout lives on in ToolsOrbit.jsx.

const STEP_S = 5; // auto-advance interval, seconds
// The dictée preview plays a ~10 s story (listen, type, correct): during the
// auto-advance it gets enough time to play through once.
const stepFor = (tool) => (tool.route === "dictee" ? 10.5 : STEP_S);

const tone = (tool, dark) => PALETTE[tool.tone][dark ? "dark" : "light"];
const onInk = (tool) => (tool.tone === "night" ? "#14204A" : "#FFFFFF");

// ── Panel screens: a larger mock of each tool, flat colours only ─────────────

function Frame({ ink, soft, label, children }) {
  const { c } = useApp();
  return (
    <div className={`rounded-3xl p-5 md:p-6 ${c.card}`} style={{ boxShadow: `0 0 0 2px ${soft}` }}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono2 text-xs font-bold" style={{ color: ink }}>{label}</span>
        <span className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full" style={{ background: soft }} />)}</span>
      </div>
      {children}
    </div>
  );
}

function Options({ ink, soft, items, right }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2 mt-4">
      {items.map((x, i) => {
        const ok = i === right;
        return (
          <div key={x} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
            style={ok ? { background: ink, color: "#FFFFFF" } : { background: soft, color: ink }}>
            <span className="w-5 text-xs font-bold opacity-80">{"ABCD"[i]}</span>
            <span className="flex-1 truncate">{x}</span>
            {ok && <Check size={15} />}
          </div>
        );
      })}
    </div>
  );
}

function ScreenCO({ ink, soft }) {
  const { c } = useApp();
  const bars = [30, 55, 40, 75, 50, 90, 60, 80, 45, 70, 35, 85, 55, 65, 40, 95, 50, 72, 38, 60, 82, 46, 68, 52, 88, 42];
  return (
    <Frame ink={ink} soft={soft} label="QUESTION 12 / 39">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-11 h-11 rounded-full shrink-0" style={{ background: ink, color: "#FFFFFF" }}><Play size={18} fill="currentColor" /></span>
        <div className="flex-1 flex items-end gap-[3px] h-12">
          {bars.map((h, i) => (
            <span key={i} className="eqbar flex-1 rounded-full" style={{ height: `${h}%`, background: i < 11 ? ink : soft, animationDelay: `${(i % 9) * -0.12}s` }} />
          ))}
        </div>
      </div>
      <p className={`mt-4 text-sm font-semibold ${c.text}`}>Où se trouve la femme ?</p>
      <Options ink={ink} soft={soft} items={["À la gare", "Dans un magasin", "Au bureau", "Chez le médecin"]} right={1} />
      <p className="mt-3 font-mono2 text-xs font-semibold" style={{ color: ink }}>1 écoute · comme le jour J</p>
    </Frame>
  );
}

function ScreenCE({ ink, soft }) {
  const { c } = useApp();
  return (
    <Frame ink={ink} soft={soft} label="DOCUMENT 7">
      <div className={`space-y-2 text-sm leading-relaxed ${c.sub}`}>
        <p>Avis aux résidents : la piscine municipale fermera ses portes du 3 au 17 août pour des travaux d'entretien.{" "}
          <mark className="rounded px-1 font-semibold" style={{ background: soft, color: ink }}>Les abonnements seront prolongés d'autant.</mark>
        </p>
      </div>
      <p className={`mt-4 text-sm font-semibold ${c.text}`}>Que se passe-t-il pour les abonnés ?</p>
      <Options ink={ink} soft={soft} items={["Ils sont remboursés", "Leur abonnement est prolongé", "Ils paient moins cher", "Rien ne change"]} right={1} />
    </Frame>
  );
}

function ScreenEE({ ink, soft }) {
  const { c } = useApp();
  return (
    <Frame ink={ink} soft={soft} label="TÂCHE 2 · COURRIEL">
      <p className={`text-sm leading-relaxed ${c.sub}`}>
        Madame, Monsieur, je me permets de vous écrire au sujet de l'annonce parue la semaine dernière. Je souhaiterais obtenir davantage de précisions sur le logement proposé
        <span className="caret-blink inline-block w-[2px] h-[1.1em] align-[-0.2em] ml-0.5" style={{ background: ink }} />
      </p>
      <div className="mt-4 flex items-center justify-between font-mono2 text-xs font-semibold" style={{ color: ink }}>
        <span>142 / 120 mots</span><span>✓ longueur atteinte</span>
      </div>
      <div className="mt-2 h-2 rounded-full" style={{ background: ink }} />
      <div className="mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold" style={{ background: soft, color: ink }}>
        <Sparkles size={15} /> Analyse IA : registre adapté, 2 accords à revoir
      </div>
    </Frame>
  );
}

function ScreenEO({ ink, soft }) {
  const { c } = useApp();
  const bars = [20, 45, 70, 50, 85, 60, 35, 75, 55, 90, 40, 65, 30, 80, 50, 60, 25, 70];
  return (
    <Frame ink={ink} soft={soft} label="TÂCHE 2 · INTERACTION">
      <div className="flex flex-col items-center py-2">
        <span className="relative grid place-items-center w-20 h-20 rounded-full" style={{ background: ink, color: "#FFFFFF" }}>
          <span className="invite-ping absolute inset-0 rounded-full border-2" style={{ borderColor: ink }} />
          <Mic size={30} />
        </span>
        <span className="mt-3 font-mono2 text-3xl font-bold tabular-nums" style={{ color: ink }}>
          <span className="rec-dot inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: "#D8354A" }} />02:14
        </span>
        <div className="mt-4 w-full flex items-center justify-center gap-[3px] h-10">
          {bars.map((h, i) => (
            <span key={i} className="eqbar w-1.5 rounded-full" style={{ height: `${h}%`, background: soft, animationDelay: `${(i % 7) * -0.15}s` }} />
          ))}
        </div>
      </div>
      <p className={`text-center text-sm ${c.sub}`}>Réécoutez-vous, puis comparez avec l'exemple de réponse.</p>
    </Frame>
  );
}

// The dictée, played as a loop of its three steps: the model answer is read
// aloud (speaker + waveform), the learner's text is typed out — mistake
// included — then the correction strikes the wrong form, shows the right one,
// the score and the rule. Restarts whenever the dictée is selected (the panel
// remounts); under reduced motion it shows the corrected result directly.
const DICTEE = { before: "Les candidats qui se sont ", wrong: "préparé", right: "préparés", after: " régulièrement obtiennent de meilleurs résultats." };
const DICTEE_TEXT = DICTEE.before + DICTEE.wrong + DICTEE.after;
const DICTEE_STEPS = ["Écoute", "Vous écrivez", "Correction"];
const LISTEN_MS = 2200;
const TYPE_MS_PER_CHAR = 35;
const CHECK_MS = 4200;

function useDicteeLoop(still) {
  const reduced = still || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [phase, setPhase] = useState(reduced ? 2 : 0);
  const [typed, setTyped] = useState(reduced ? DICTEE_TEXT.length : 0);
  const done = typed >= DICTEE_TEXT.length;
  // Listening, then the correction, each hold for a fixed time.
  useEffect(() => {
    if (reduced || phase === 1) return;
    if (phase === 0) setTyped(0);
    const timer = window.setTimeout(() => setPhase(phase === 0 ? 1 : 0), phase === 0 ? LISTEN_MS : CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [phase, reduced]);
  // Typing: one character per tick, then a short pause before the correction.
  useEffect(() => {
    if (reduced || phase !== 1) return;
    if (done) {
      const timer = window.setTimeout(() => setPhase(2), 400);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setTyped((n) => n + 1), TYPE_MS_PER_CHAR);
    return () => window.clearTimeout(timer);
  }, [phase, typed, done, reduced]);
  return { phase, typed };
}

function ScreenDictee({ ink, soft, still }) {
  const { phase, typed } = useDicteeLoop(still);
  const bars = [35, 60, 45, 80, 55, 95, 50, 70, 40, 85, 60, 45, 75, 50, 90, 40, 65, 55, 80, 45];
  const caret = <span className="caret-blink inline-block w-[2px] h-[1.1em] align-[-0.2em] ml-0.5 bg-white" />;
  const corrected = (
    <>
      {DICTEE.before}
      <span className="line-through decoration-2 text-white/50" style={{ textDecorationColor: "#F08A9B" }}>{DICTEE.wrong}</span>{" "}
      <span className="rise inline-block font-bold rounded px-1" style={{ color: "#14204A", background: ink }}>{DICTEE.right}</span>
      {DICTEE.after}
    </>
  );
  return (
    <div className="rounded-3xl p-5 md:p-6" style={{ background: soft }}>
      {/* Step indicator + score (shown once corrected). */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          {DICTEE_STEPS.map((label, i) => (
            <span key={label} className="px-2.5 py-1 rounded-full font-mono2 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300"
              style={i === phase ? { background: ink, color: "#14204A" } : { background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.55)" }}>
              {i + 1} · {label}
            </span>
          ))}
        </div>
        <span className={`font-display font-extrabold text-2xl transition-opacity duration-300 ${phase === 2 ? "opacity-100" : "opacity-0"}`} style={{ color: ink }}>96 %</span>
      </div>

      {/* Audio: playing during the listening step, then a finished track. */}
      <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-white/5">
        <span className="relative grid place-items-center w-10 h-10 rounded-full shrink-0" style={{ background: ink, color: "#14204A" }}>
          {phase === 0 && <span className="invite-ping absolute inset-0 rounded-full border-2" style={{ borderColor: ink }} />}
          <Volume2 size={18} />
        </span>
        <div className="flex-1 flex items-end gap-[3px] h-8">
          {bars.map((h, i) => (
            <span key={i} className={`flex-1 rounded-full ${phase === 0 ? "eqbar" : ""}`}
              style={{ height: phase === 0 ? `${h}%` : "22%", background: phase === 0 ? ink : "rgba(255,255,255,.25)", animationDelay: `${(i % 8) * -0.12}s` }} />
          ))}
        </div>
        <span className="font-mono2 text-[11px] font-semibold text-white/70 whitespace-nowrap">
          {phase === 0 ? "Lecture du corrigé…" : "Corrigé C1 · lu"}
        </span>
      </div>

      {/* The learner's text: typed out, then corrected. The corrected text
          (the longest state) sits invisibly underneath so the box keeps its
          height while the text types itself out. */}
      <p className="mt-4 grid font-mono2 text-sm md:text-base leading-loose text-white/90">
        <span className="invisible [grid-area:1/1]">{corrected}</span>
        <span className="[grid-area:1/1]">
          {phase < 2 ? <>{DICTEE_TEXT.slice(0, typed)}{phase === 1 && caret}</> : corrected}
        </span>
      </p>

      {/* The rule, once the mistake is identified. */}
      <div className={`mt-3 rounded-xl px-3 py-2 text-sm text-white/85 bg-white/10 transition-opacity duration-500 ${phase === 2 ? "opacity-100" : "opacity-0"}`}>
        <span className="font-bold" style={{ color: ink }}>Accord du participe passé</span> : avec « être », il s'accorde avec le sujet, « les candidats ».
      </div>
    </div>
  );
}

function ScreenVocab({ ink, soft }) {
  const { c } = useApp();
  return (
    <Frame ink={ink} soft={soft} label="THÈME · IMMIGRATION">
      {/* The stack peeks out above the front card, never below it. */}
      <div className="relative h-36">
        <div className="absolute inset-x-12 top-0 bottom-8 rounded-2xl -rotate-2" style={{ background: soft }} />
        <div className="absolute inset-x-7 top-1.5 bottom-6 rounded-2xl rotate-[1.5deg]" style={{ background: soft, opacity: 0.6 }} />
        <div className={`absolute inset-x-2 top-4 bottom-0 rounded-2xl grid place-items-center text-center px-4 ${c.card}`}
          style={{ boxShadow: `0 0 0 2px ${ink}` }}>
          <div>
            <p className="font-display font-extrabold text-xl" style={{ color: ink }}>le permis de travail</p>
            <p className={`mt-1 text-xs ${c.faint}`}>« Il a obtenu son permis de travail en mars. »</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <span className="rounded-xl px-3 py-2 text-center text-sm font-bold" style={{ background: soft, color: ink }}>À revoir</span>
        <span className="rounded-xl px-3 py-2 text-center text-sm font-bold" style={{ background: ink, color: "#FFFFFF" }}>Je sais</span>
      </div>
    </Frame>
  );
}

function ScreenGrammar({ ink, soft }) {
  const { c } = useApp();
  return (
    <Frame ink={ink} soft={soft} label="LEÇON · LE SUBJONCTIF">
      <p className={`text-sm leading-relaxed ${c.sub}`}>
        Après <span className="font-bold" style={{ color: ink }}>il faut que</span>, le verbe se met au subjonctif.
      </p>
      <p className={`mt-4 text-base font-semibold ${c.text}`}>
        Il faut que tu <span className="inline-block min-w-[5.5rem] border-b-2 text-center font-bold" style={{ borderColor: ink, color: ink }}>viennes</span> demain.
      </p>
      <Options ink={ink} soft={soft} items={["viens", "viennes", "viendras", "venir"]} right={1} />
    </Frame>
  );
}

const SCREENS = { listening: ScreenCO, reading: ScreenCE, writing: ScreenEE, speaking: ScreenEO, dictee: ScreenDictee, vocabulary: ScreenVocab, grammar: ScreenGrammar };

// The selected tool's panel: kind, title, description, screen, link.
function Panel({ tool, n, still }) {
  const { t, dark, c } = useApp();
  const [bg, ink, soft] = tone(tool, dark);
  const night = tool.tone === "night";
  const Screen = SCREENS[tool.route];
  return (
    <div className="rounded-[32px] p-6 md:p-8 h-full flex flex-col gap-5 border-2 transition-colors duration-300" style={{ background: bg, borderColor: `${ink}55` }}>
      <div key={tool.route} className="rise flex flex-col gap-5 h-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono2 text-xs font-bold" style={{ color: ink }}>{String(n).padStart(2, "0")} · {t(tool.kind)}</span>
            <h3 className={`mt-1 font-display font-extrabold text-2xl md:text-3xl ${night ? "text-white" : c.text}`}>{t(tool.t)}</h3>
            <p className={`mt-2 text-sm md:text-base leading-relaxed ${night ? "text-white/75" : c.sub}`}>{t(tool.d)}</p>
          </div>
          <span className="hidden sm:grid place-items-center w-12 h-12 rounded-2xl shrink-0" style={{ background: ink, color: onInk(tool) }}>
            <tool.icon size={22} />
          </span>
        </div>
        <div aria-hidden="true"><Screen ink={ink} soft={soft} still={still} /></div>
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
      className={`group relative block rounded-2xl px-4 py-3 border-2 outline-none transition-colors focus-visible:ring-2 ${on ? "" : `${c.border} ${c.card} hover:bg-slate-500/5`}`}
      style={on ? { background: soft, borderColor: `${ink}55` } : undefined}>
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
        <span className="absolute left-4 right-4 bottom-1.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.55)" }} aria-hidden="true">
          <span className="showcase-progress block h-full rounded-full" onAnimationEnd={onDone}
            style={{ background: ink, animationDuration: `${stepFor(tool)}s`, animationPlayState: running ? "running" : "paused" }} />
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

function MockPass() {
  const { t, dark, c } = useApp();
  const blue = PALETTE.blue[dark ? "dark" : "light"];
  const page = dark ? "#020617" : "#FFFFFF"; // the (plain) section behind the ticket
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
        <RouteLink r="mocks" className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold whitespace-nowrap text-white transition hover:gap-3"
          style={{ background: blue[1] }}>
          {t("Passer un TCF blanc")} <ArrowRight size={16} />
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

export function ToolsShowcase() {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true); // until the first interaction (desktop only)
  const [visible, setVisible] = useState(false);

  // The progress bar (and so the auto-advance) only runs while the section is
  // on screen. Under reduced motion the bar's animation is disabled globally,
  // so it never ends and the list simply stays put.
  useEffect(() => {
    if (typeof window === "undefined" || !window.IntersectionObserver) return;
    // On small screens the list is an accordion: advancing would open panel
    // after panel and shift the page while the visitor scrolls, so it stays put.
    if (!window.matchMedia("(min-width: 1024px)").matches) setAuto(false);
    const io = new window.IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const select = (i) => { setAuto(false); setActive(i); };
  const next = () => setActive((i) => (i + 1) % TOOLS.length);

  return (
    <div ref={ref}>
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-10 items-stretch">
        <nav aria-label="Outils" className="flex flex-col gap-1.5">
          {TOOLS.map((tl, i) => (
            <div key={tl.route}>
              <Item tool={tl} i={i} active={active} select={select} auto={auto} running={visible} onDone={next} />
              {/* Accordion on small screens: the panel opens under its tool. */}
              {active === i && <div className="lg:hidden mt-3 mb-2"><Panel tool={tl} n={i + 1} /></div>}
            </div>
          ))}
        </nav>
        {/* All seven panels share one grid cell, only the selected one visible,
            so the cell is always as tall as the tallest panel and switching
            tools never moves the rest of the page. The hidden ones are still
            (the dictée doesn't loop); the selected one remounts, which restarts
            its animation. */}
        <div className="hidden lg:grid min-h-[560px]">
          {TOOLS.map((tl, i) => {
            const on = i === active;
            return (
              <div key={`${tl.route}-${on}`} className={`[grid-area:1/1] ${on ? "" : "invisible"}`} aria-hidden={on ? undefined : "true"}>
                <Panel tool={tl} n={i + 1} still={!on} />
              </div>
            );
          })}
        </div>
      </div>
      <MockPass />
    </div>
  );
}
