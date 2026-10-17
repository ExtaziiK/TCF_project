import { Headphones, BookOpen, PenLine, Mic, Keyboard, Languages, GraduationCap } from "lucide-react";

// The seven landing-page tools, their flat colour palettes and their small
// live previews — shared by the landing showcase (ToolsShowcase) and the
// earlier orbit layout (ToolsOrbit), which is kept so it can be switched back.

// Flat palettes per tool: background, accent ("ink") and a soft accent fill.
export const PALETTE = {
  blue: { light: ["#E3ECFD", "#2E6BE6", "#C7D8FC"], dark: ["#12224A", "#7FA6F5", "#1C3570"] },
  rose: { light: ["#FCE7EC", "#D8354A", "#F9CDD6"], dark: ["#3A1626", "#F08A9B", "#5A2134"] },
  violet: { light: ["#ECE8FD", "#6C4FE0", "#D9D0FC"], dark: ["#1E1A4D", "#A895F7", "#33297A"] },
  amber: { light: ["#FDF0D9", "#B7700F", "#FBDFAE"], dark: ["#3A2A0E", "#F5C26B", "#5C4214"] },
  mint: { light: ["#DDF3EA", "#0F8A5F", "#BDE8D6"], dark: ["#0E3A2C", "#5FD3A6", "#155440"] },
  fuchsia: { light: ["#FAE8FB", "#B5179E", "#F3CDF0"], dark: ["#3A1238", "#E879D9", "#561A52"] },
  night: { light: ["#14204A", "#F5A524", "#23336B"], dark: ["#1B2C66", "#F5C26B", "#2A3E85"] },
};

// The look of the TCF blanc block (orbit hub, showcase strip).
export const HUB = { light: ["#2E6BE6", "#F5A524", "#4A80EC"], dark: ["#2856B8", "#F5C26B", "#3A68C9"] };

export const TOOLS = [
  { route: "listening", icon: Headphones, tone: "blue", kind: "Épreuve officielle", t: "Compréhension orale",
    d: "Des audios aux accents québécois et français, diffusés une seule fois comme le jour de l'examen, corrigés instantanément.", preview: "wave" },
  { route: "reading", icon: BookOpen, tone: "rose", kind: "Épreuve officielle", t: "Compréhension écrite",
    d: "Textes authentiques, surlignage interactif et explications détaillées.", preview: "text" },
  { route: "writing", icon: PenLine, tone: "violet", kind: "Épreuve officielle", t: "Expression écrite",
    d: "Éditeur avec compteur de mots, exemples de réponses et analyse IA.", preview: "count" },
  { route: "speaking", icon: Mic, tone: "amber", kind: "Épreuve officielle", t: "Expression orale",
    d: "Enregistrez-vous, réécoutez-vous et suivez vos progrès tâche par tâche.", preview: "rec" },
  { route: "dictee", icon: Keyboard, tone: "night", kind: "Nouveau", t: "La dictée",
    d: "Écoutez un corrigé de niveau C1 ou C2 et écrivez-le mot à mot : chaque écart est corrigé, avec sa raison.", preview: "dictee" },
  { route: "vocabulary", icon: Languages, tone: "mint", kind: "Entraînement", t: "Vocabulaire ciblé",
    d: "Cartes mémoire par thème : immigration, travail, vie quotidienne.", preview: "cards" },
  { route: "grammar", icon: GraduationCap, tone: "fuchsia", kind: "Entraînement", t: "Grammaire structurée",
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

export const PREVIEWS = { wave: Wave, text: TextLines, count: WordCount, rec: Recording, dictee: Dictee, cards: Cards, chips: Chips };

