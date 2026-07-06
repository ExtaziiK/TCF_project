import { useState } from "react";
import { BookOpen, Highlighter } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { getBank } from "@/services/bankService";
import { READ_SENTENCES, READ_QS } from "@/constants/reading";

// Premium module backed by the question bank (section "ce"). The legacy
// demo below only renders if the bank section is ever empty.
export function Reading() {
  if (getBank().ce.length > 0) {
    return (
      <BankExplorer
        sections={["ce"]}
        eyebrow="Compréhension écrite"
        title="Lisez comme un futur résident"
        sub="Tous les quiz officiels de compréhension écrite : textes authentiques sur la vie et l'immigration au Canada, en conditions d'examen."
      />
    );
  }
  return <ReadingDemo />;
}

function ReadingDemo() {
  const { c, nav } = useApp();
  const [hlMode, setHlMode] = useState(false);
  const [hl, setHl] = useState([]);
  const toggle = (i) => { if (!hlMode) return; setHl(hl.includes(i) ? hl.filter((x) => x !== i) : [...hl, i]); };
  const passage = (
    <Card className="p-6 md:p-7">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <Pill tone="blue"><BookOpen size={12} /> Texte · L'immigration francophone au Canada</Pill>
        <button onClick={() => setHlMode(!hlMode)} aria-pressed={hlMode} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${hlMode ? "bg-amber-500/20 text-amber-600" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
          <Highlighter size={15} /> {hlMode ? "Surlignage actif — cliquez une phrase" : "Surligner le texte"}
        </button>
      </div>
      <p className={`leading-loose text-[15px] ${c.text}`}>
        {READ_SENTENCES.map((s, i) => (
          <span key={i} onClick={() => toggle(i)} className={`${hlMode ? "cursor-pointer" : ""} rounded px-0.5 transition-colors ${hl.includes(i) ? "bg-amber-300/60 text-slate-900" : hlMode ? "hover:bg-amber-200/40" : ""}`}>{s} </span>
        ))}
      </p>
    </Card>
  );
  return (
    <PageShell eyebrow="Compréhension écrite" title="Lisez comme un futur résident" sub="Textes authentiques sur la vie et l'immigration au Canada. Surlignez les passages clés, comme vous le feriez au brouillon.">
      <Quiz questions={READ_QS} duration={480} storageKey="read" above={passage} doneExtra={<Btn variant="ghost" onClick={() => nav("vocabulary")}>Réviser le vocabulaire</Btn>} />
    </PageShell>
  );
}
