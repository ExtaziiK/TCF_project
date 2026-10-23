import { useEffect, useState } from "react";
import { Check, Play, Mic, Sparkles, Volume2, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Frame } from "@/components/home/ToolDemos";

// The tools showcase's animated previews: what each panel plays until the
// visitor presses "Essayer maintenant", at which point the showcase swaps in
// the working demo (DemoQuestion*, ToolDemos.jsx). The two expression panels
// have no demo — their mock, which ends on the AI's correction, is all they
// show. Pictures only — the showcase marks them aria-hidden. `still` freezes a
// mock while its panel is hidden.

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

// Typed out, then sent to the AI, then corrected: the loop for the two
// expression panels, which stay demo-only (the real analysis needs an
// account). `len` characters are typed one by one (phase 0), then each later
// phase holds for its duration in `after`; frozen on the last one.
function useTypedLoop(len, after, still, msPerChar = 26) {
  const frozen = still || prefersReduced();
  const [phase, setPhase] = useState(0);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (frozen) return;
    if (phase === 0) {
      const id = n < len ? window.setTimeout(() => setN(n + 1), msPerChar) : window.setTimeout(() => setPhase(1), 400);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      const next = (phase + 1) % (after.length + 1);
      if (next === 0) setN(0);
      setPhase(next);
    }, after[phase - 1]);
    return () => window.clearTimeout(id);
  }, [phase, n, frozen, len, after, msPerChar]);
  return frozen ? { phase: after.length, n: len } : { phase, n };
}

// A text with mistakes: plain strings, and { wrong, right } pairs. Typed, it
// reads with the mistakes; corrected, each one is struck through with the
// right form beside it.
const plainOf = (segs) => segs.map((x) => (typeof x === "string" ? x : x.wrong)).join("");

function Corrected({ segs, ink, corrected }) {
  return segs.map((x, i) =>
    typeof x === "string" ? <span key={i}>{x}</span> : corrected ? (
      <span key={i}>
        <span className="line-through decoration-2 opacity-60" style={{ textDecorationColor: "#D8354A" }}>{x.wrong}</span>{" "}
        <span className="rise inline-block font-bold rounded px-1" style={{ background: ink, color: "#FFFFFF" }}>{x.right}</span>
      </span>
    ) : <span key={i}>{x.wrong}</span>,
  );
}

// The AI's verdict: level badge and two short notes.
function Verdict({ ink, soft, level, notes }) {
  const { c } = useApp();
  return (
    <div className="rise mt-4 rounded-2xl p-3" style={{ background: soft }}>
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: ink }}>
        <Sparkles size={15} /> Analyse IA <span className="ml-auto rounded-full px-2.5 py-0.5 text-xs text-white" style={{ background: ink }}>{level}</span>
      </div>
      <ul className={`mt-2 space-y-1 text-xs ${c.sub}`}>
        {notes.map((n) => <li key={n}>• {n}</li>)}
      </ul>
    </div>
  );
}

function Analysing({ ink, label }) {
  return (
    <div className="mt-4 flex items-center gap-2 text-sm font-semibold" style={{ color: ink }}>
      <Loader2 size={15} className="animate-spin" /> {label}
    </div>
  );
}

// Writing: the email types itself out (three spelling mistakes in it), the AI
// reads it, then shows what the real correction gives back — the spelling
// fixed, a CEFR rating per criterion, and the same email rewritten at C1.
const EE_SEGS = [
  "Madame, Monsieur, je me permets de vous écrire au sujet de l'annonce parue la semaine ",
  { wrong: "derniere", right: "dernière" },
  ". Je souhaiterais obtenir davantage de ",
  { wrong: "précision", right: "précisions" },
  " sur le logement, notamment sur les charges qui sont ",
  { wrong: "compris", right: "comprises" },
  " dans le loyer.",
];
const EE_TEXT = plainOf(EE_SEGS);
// The C1 rewrite, as plain text and upgraded phrases (highlighted).
const EE_C1 = [
  "Madame, Monsieur, ",
  { up: "à la suite de" },
  " votre annonce parue la semaine dernière, je ",
  { up: "me permets de vous solliciter afin d'obtenir" },
  " des précisions ",
  { up: "complémentaires" },
  " sur le logement, ",
  { up: "en particulier" },
  " sur les charges comprises dans le loyer.",
];
const EE_RATINGS = [["Orthographe", "B1"], ["Grammaire", "B2"], ["Lexique", "B2"], ["Cohérence", "C1"]];
const EE_AFTER = [1400, 4200, 4800]; // analysing, the spelling + ratings, the C1 version
const countWords = (x) => (x.trim() ? x.trim().split(/\s+/).length : 0);

function StepLabel({ ink, children }) {
  return <p className="mb-1.5 font-mono2 text-[10px] font-bold uppercase tracking-widest" style={{ color: ink }}>{children}</p>;
}

// The AI's rating: overall level, then one per criterion.
function Ratings({ ink, soft }) {
  const { c } = useApp();
  return (
    <div className="mb-4 rounded-2xl p-3" style={{ background: soft }}>
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: ink }}>
        <Sparkles size={15} /> Évaluation IA
        <span className="ml-auto rounded-full px-2.5 py-0.5 text-xs text-white" style={{ background: ink }}>Global B2 · NCLC 8</span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {EE_RATINGS.map(([k, v]) => (
          <span key={k} className={`flex items-center justify-between rounded-lg px-2.5 py-1 text-xs ${c.card}`}>
            <span className={c.sub}>{k}</span>
            <span className="font-display font-extrabold" style={{ color: ink }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ScreenEE({ ink, soft, still }) {
  const { c } = useApp();
  const { phase, n } = useTypedLoop(EE_TEXT.length, EE_AFTER, still);
  const words = countWords(EE_TEXT.slice(0, n));
  const layer = (on) => `[grid-area:1/1] ${on ? "" : "invisible"}`;
  return (
    <Frame ink={ink} soft={soft} label="TÂCHE 2 · COURRIEL">
      {/* The courriel stays at the top throughout: typed out, then — once the
          AI has read it — with its mistakes underlined in red. The full text
          sits invisibly underneath the typing so the box never changes height. */}
      <p className={`grid text-sm leading-relaxed ${c.sub}`}>
        <span className="invisible [grid-area:1/1]">{EE_TEXT}</span>
        <span className="[grid-area:1/1]">
          {phase >= 2
            ? EE_SEGS.map((x, i) => (typeof x === "string" ? <span key={i}>{x}</span> : (
              <span key={i} className="underline decoration-wavy decoration-2 underline-offset-4" style={{ textDecorationColor: "#D8354A" }}>{x.wrong}</span>
            )))
            : EE_TEXT.slice(0, n)}
          {phase === 0 && <span className="caret-blink inline-block w-[2px] h-[1.1em] align-[-0.2em] ml-0.5" style={{ background: ink }} />}
        </span>
      </p>
      <div className="mt-3 font-mono2 text-xs font-semibold" style={{ color: ink }}>{words} mots</div>
      {/* Below it, what the AI gives back: its rating, then the spelling
          fixed, then the whole rewritten at C1. Stacked in one cell, the
          inactive states invisible, so the mock keeps one height. */}
      <div className="grid mt-4">
        <div className={layer(phase <= 1)}>
          {phase === 1 && <Analysing ink={ink} label="L'IA lit votre texte…" />}
        </div>
        <div className={layer(phase === 2)}>
          <Ratings ink={ink} soft={soft} />
          <StepLabel ink={ink}>Orthographe corrigée</StepLabel>
          <p className={`text-sm leading-relaxed ${c.sub}`}><Corrected segs={EE_SEGS} ink={ink} corrected={phase === 2} /></p>
        </div>
        <div className={layer(phase === 3)}>
          <Ratings ink={ink} soft={soft} />
          <StepLabel ink={ink}>Version C1 proposée</StepLabel>
          <p className={`text-sm leading-relaxed ${c.sub}`}>
            {EE_C1.map((x, i) => (typeof x === "string" ? <span key={i}>{x}</span> : (
              <mark key={i} className="rounded px-0.5 font-semibold" style={{ background: soft, color: ink }}>{x.up}</mark>
            )))}
          </p>
        </div>
      </div>
    </Frame>
  );
}

// Speaking: recording with a live transcript, then the AI's corrections.
const EO_SEGS = [
  "Je m'appelle Karim, je suis ingénieur. ",
  { wrong: "J'ai arrivé", right: "Je suis arrivé" },
  " au Québec il y a deux ans et je travaille ",
  { wrong: "dans", right: "à" },
  " Montréal depuis l'été dernier.",
];
const EO_TEXT = plainOf(EO_SEGS);
const EO_AFTER = [1400, 4800];

function ScreenEO({ ink, soft, still }) {
  const { c } = useApp();
  const { phase, n } = useTypedLoop(EO_TEXT.length, EO_AFTER, still, 45);
  const bars = [20, 45, 70, 50, 85, 60, 35, 75, 55, 90, 40, 65, 30, 80, 50, 60, 25, 70];
  const recording = phase === 0;
  const secs = Math.floor((n * 45) / 1000);
  return (
    <Frame ink={ink} soft={soft} label="TÂCHE 1 · ENTRETIEN">
      <div className="flex items-center gap-4">
        <span className="relative grid place-items-center w-14 h-14 rounded-full shrink-0" style={{ background: recording ? "#D8354A" : ink, color: "#FFFFFF" }}>
          {recording && <span className="invite-ping absolute inset-0 rounded-full border-2" style={{ borderColor: "#D8354A" }} />}
          <Mic size={24} />
        </span>
        <div className="flex-1">
          <span className="font-mono2 text-xl font-bold tabular-nums" style={{ color: ink }}>
            {recording && <span className="rec-dot inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: "#D8354A" }} />}
            00:{String(secs).padStart(2, "0")}
          </span>
          <div className="mt-1 flex items-center gap-[3px] h-6">
            {bars.map((h, i) => (
              <span key={i} className={`w-1.5 rounded-full ${recording ? "eqbar" : ""}`} style={{ height: recording ? `${h}%` : "25%", background: soft, animationDelay: `${(i % 7) * -0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
      <p className={`mt-4 font-mono2 text-[10px] font-bold uppercase tracking-widest ${c.faint}`}>Transcription</p>
      <div className="grid mt-1">
        <div className={`[grid-area:1/1] ${phase === 2 ? "invisible" : ""}`}>
          <p className={`text-sm leading-relaxed ${c.sub}`}>{EO_TEXT.slice(0, n)}</p>
          {phase === 1 && <Analysing ink={ink} label="L'IA écoute votre réponse…" />}
        </div>
        <div className={`[grid-area:1/1] ${phase === 2 ? "" : "invisible"}`}>
          <p className={`text-sm leading-relaxed ${c.sub}`}><Corrected segs={EO_SEGS} ink={ink} corrected /></p>
          <Verdict ink={ink} soft={soft} level="B1 · NCLC 6"
            notes={["Réponse fluide et bien organisée.", "« arriver » se conjugue avec « être » ; « à Montréal » pour une ville."]} />
        </div>
      </div>
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
    <div className="flex-1 rounded-3xl p-5 md:p-6" style={{ background: soft }}>
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
