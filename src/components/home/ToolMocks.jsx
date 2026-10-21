import { useEffect, useState } from "react";
import { Check, Play, Mic, Sparkles, Volume2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Frame } from "@/components/home/ToolDemos";

// The tools showcase's animated previews: what each panel plays on its own
// until the visitor reaches for it (hover, click or focus), at which point the
// showcase swaps in the working demo (DemoQuestion*, ToolDemos.jsx). Pictures
// only — the showcase marks them aria-hidden. `still` freezes the dictée loop
// while its panel is hidden.

// Every mock loops through a few timed phases (or types itself out). Hidden
// panels pass `still`, and reduced motion freezes them too — both on the last
// phase, the finished picture.
const prefersReduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function usePhase(durations, still) {
  const frozen = still || prefersReduced();
  const [p, setP] = useState(0);
  useEffect(() => {
    if (frozen) return;
    const id = window.setTimeout(() => setP((x) => (x + 1) % durations.length), durations[p]);
    return () => window.clearTimeout(id);
  }, [p, frozen, durations]);
  return frozen ? durations.length - 1 : p;
}

function useTyping(text, still, msPerChar = 28, holdMs = 2800) {
  const frozen = still || prefersReduced();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (frozen) return;
    const full = n >= text.length;
    const id = window.setTimeout(() => setN(full ? 0 : n + 1), full ? holdMs : msPerChar);
    return () => window.clearTimeout(id);
  }, [n, frozen, text, msPerChar, holdMs]);
  return frozen ? text.length : n;
}

// `right` lights the answer up; `wrong` marks a first, mistaken pick.
function Options({ ink, soft, items, right, wrong }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2 mt-4">
      {items.map((x, i) => {
        const ok = i === right;
        const ko = i === wrong;
        return (
          <div key={x} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-300"
            style={ok ? { background: ink, color: "#FFFFFF" } : ko ? { background: "#D8354A", color: "#FFFFFF" } : { background: soft, color: ink }}>
            <span className="w-5 text-xs font-bold opacity-80">{"ABCD"[i]}</span>
            <span className="flex-1 truncate">{x}</span>
            {ok && <Check size={15} />}
          </div>
        );
      })}
    </div>
  );
}

const CO_PHASES = [2600, 2400]; // listening, then the answer lights up

function ScreenCO({ ink, soft, still }) {
  const { c } = useApp();
  const phase = usePhase(CO_PHASES, still);
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
      <Options ink={ink} soft={soft} items={["À la gare", "Dans un magasin", "Au bureau", "Chez le médecin"]} right={phase === 1 ? 1 : -1} />
      <p className="mt-3 font-mono2 text-xs font-semibold" style={{ color: ink }}>1 écoute · comme le jour J</p>
    </Frame>
  );
}

const CE_PHASES = [1800, 1800, 2600]; // reading, the key sentence highlighted, the answer

function ScreenCE({ ink, soft, still }) {
  const { c } = useApp();
  const phase = usePhase(CE_PHASES, still);
  return (
    <Frame ink={ink} soft={soft} label="DOCUMENT 7">
      <div className={`space-y-2 text-sm leading-relaxed ${c.sub}`}>
        <p>Avis aux résidents : la piscine municipale fermera ses portes du 3 au 17 août pour des travaux d'entretien.{" "}
          <mark className="rounded px-1 font-semibold transition-colors duration-500" style={phase >= 1 ? { background: soft, color: ink } : { background: "transparent", color: "inherit" }}>Les abonnements seront prolongés d'autant.</mark>
        </p>
      </div>
      <p className={`mt-4 text-sm font-semibold ${c.text}`}>Que se passe-t-il pour les abonnés ?</p>
      <Options ink={ink} soft={soft} items={["Ils sont remboursés", "Leur abonnement est prolongé", "Ils paient moins cher", "Rien ne change"]} right={phase === 2 ? 1 : -1} />
    </Frame>
  );
}

// Typed out, the counter climbing with it; the AI verdict appears at the end.
const EE_TEXT = "Madame, Monsieur, je me permets de vous écrire au sujet de l'annonce parue la semaine dernière. Je souhaiterais obtenir davantage de précisions sur le logement proposé.";
const countWords = (x) => (x.trim() ? x.trim().split(/\s+/).length : 0);
const EE_WORDS = countWords(EE_TEXT);

function ScreenEE({ ink, soft, still }) {
  const { c } = useApp();
  const n = useTyping(EE_TEXT, still);
  const shown = EE_TEXT.slice(0, n);
  const words = countWords(shown);
  const done = n >= EE_TEXT.length;
  return (
    <Frame ink={ink} soft={soft} label="TÂCHE 2 · COURRIEL">
      {/* The full text sits invisibly underneath so the box never changes height. */}
      <p className={`grid text-sm leading-relaxed ${c.sub}`}>
        <span className="invisible [grid-area:1/1]">{EE_TEXT}</span>
        <span className="[grid-area:1/1]">
          {shown}
          <span className="caret-blink inline-block w-[2px] h-[1.1em] align-[-0.2em] ml-0.5" style={{ background: ink }} />
        </span>
      </p>
      <div className="mt-4 flex items-center justify-between font-mono2 text-xs font-semibold" style={{ color: ink }}>
        <span>{words} mots</span><span className={done ? "" : "opacity-0"}>✓ longueur atteinte</span>
      </div>
      <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: soft }}>
        <div className="h-full rounded-full" style={{ width: `${(words / EE_WORDS) * 100}%`, background: ink }} />
      </div>
      <div className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`} style={{ background: soft, color: ink }}>
        <Sparkles size={15} /> Analyse IA : registre adapté, 2 accords à revoir
      </div>
    </Frame>
  );
}

function ScreenEO({ ink, soft, still }) {
  const { c } = useApp();
  // The recording timer runs (and wraps at two minutes).
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (still || prefersReduced()) return;
    const id = window.setInterval(() => setSecs((x) => (x + 1) % 120), 1000);
    return () => window.clearInterval(id);
  }, [still]);
  const bars = [20, 45, 70, 50, 85, 60, 35, 75, 55, 90, 40, 65, 30, 80, 50, 60, 25, 70];
  return (
    <Frame ink={ink} soft={soft} label="TÂCHE 2 · INTERACTION">
      <div className="flex flex-col items-center py-2">
        <span className="relative grid place-items-center w-20 h-20 rounded-full" style={{ background: ink, color: "#FFFFFF" }}>
          <span className="invite-ping absolute inset-0 rounded-full border-2" style={{ borderColor: ink }} />
          <Mic size={30} />
        </span>
        <span className="mt-3 font-mono2 text-3xl font-bold tabular-nums" style={{ color: ink }}>
          <span className="rec-dot inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: "#D8354A" }} />0{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
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
// the score and the rule. Frozen on that corrected result while its panel is
// hidden, and under reduced motion.
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

const VOCAB_PHASES = [2200, 2400, 1000]; // the word, its definition, "Je sais" pressed

function ScreenVocab({ ink, soft, still }) {
  const { c } = useApp();
  const phase = usePhase(VOCAB_PHASES, still);
  return (
    <Frame ink={ink} soft={soft} label="THÈME · IMMIGRATION">
      {/* The stack peeks out above the front card, never below it. */}
      <div className="relative h-36">
        <div className="absolute inset-x-12 top-0 bottom-8 rounded-2xl -rotate-2" style={{ background: soft }} />
        <div className="absolute inset-x-7 top-1.5 bottom-6 rounded-2xl rotate-[1.5deg]" style={{ background: soft, opacity: 0.6 }} />
        <div className={`absolute inset-x-2 top-4 bottom-0 rounded-2xl grid place-items-center text-center px-4 ${c.card}`}
          style={{ boxShadow: `0 0 0 2px ${ink}` }}>
          {phase === 0 ? (
            <div key="front" className="rise">
              <p className="font-display font-extrabold text-xl" style={{ color: ink }}>le permis de travail</p>
              <p className={`mt-1 text-xs ${c.faint}`}>Cliquez pour voir la définition</p>
            </div>
          ) : (
            <div key="back" className="rise">
              <p className={`text-sm font-semibold ${c.text}`}>Document autorisant un étranger à occuper un emploi au Canada.</p>
              <p className={`mt-1 text-xs ${c.faint}`}>« Il a obtenu son permis de travail en mars. »</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <span className="rounded-xl px-3 py-2 text-center text-sm font-bold" style={{ background: soft, color: ink }}>À revoir</span>
        <span className={`rounded-xl px-3 py-2 text-center text-sm font-bold transition-transform duration-200 ${phase === 2 ? "scale-90" : ""}`} style={{ background: ink, color: "#FFFFFF" }}>Je sais</span>
      </div>
    </Frame>
  );
}

const GRAMMAR_PHASES = [1600, 1400, 2600]; // the blank, a wrong pick, the right form

function ScreenGrammar({ ink, soft, still }) {
  const { c } = useApp();
  const phase = usePhase(GRAMMAR_PHASES, still);
  return (
    <Frame ink={ink} soft={soft} label="LEÇON · LE SUBJONCTIF">
      <p className={`text-sm leading-relaxed ${c.sub}`}>
        Après <span className="font-bold" style={{ color: ink }}>il faut que</span>, le verbe se met au subjonctif.
      </p>
      <p className={`mt-4 text-base font-semibold ${c.text}`}>
        Il faut que tu <span className="inline-block min-w-[5.5rem] border-b-2 text-center font-bold" style={{ borderColor: ink, color: phase === 1 ? "#D8354A" : ink }}>{["…", "viens", "viennes"][phase]}</span> demain.
      </p>
      <Options ink={ink} soft={soft} items={["viens", "viennes", "viendras", "venir"]} right={phase === 2 ? 1 : -1} wrong={phase === 1 ? 0 : -1} />
    </Frame>
  );
}

export const MOCKS = { listening: ScreenCO, reading: ScreenCE, writing: ScreenEE, speaking: ScreenEO, dictee: ScreenDictee, vocabulary: ScreenVocab, grammar: ScreenGrammar };
