import { useState } from "react";
import { GraduationCap, Languages, CheckCircle2, XCircle, Lightbulb, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { randomSecondaryQuestion } from "@/utils/demoQuestions";

// Second hero teaser, next to the CO DemoQuestion: one MCQ drawn at random
// from the grammar or vocabulary bank, in the exact same card format (no
// audio player). The pick is made once per mount so it doesn't change under
// the visitor while they're answering.
export function DemoQuestionSecondary() {
  const { c, nav, t } = useApp();
  const [q] = useState(randomSecondaryQuestion);
  const [sel, setSel] = useState(null);
  const isGrammar = q.kind === "grammar";
  const Icon = isGrammar ? GraduationCap : Languages;

  return (
    <Card className="p-6 md:p-7 shadow-xl shadow-rose-600/10 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-rose-600/10 blur-2xl" aria-hidden="true" />
      <div className="flex items-center justify-between mb-4 relative">
        <Pill tone="red"><Icon size={12} /> {t("Question bonus ·")} {t(isGrammar ? "Grammaire" : "Vocabulaire")}</Pill>
        <Pill tone="slate">{t(q.tag)}</Pill>
      </div>
      <p className={`text-sm leading-relaxed mb-5 ${c.text}`}>{q.q}</p>
      <div className="space-y-2.5">
        {q.opts.map((o, i) => {
          const state = sel === null ? "idle" : i === q.a ? "right" : i === sel ? "wrong" : "dim";
          return (
            <button key={o} disabled={sel !== null} onClick={() => setSel(i)}
              className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between gap-2
              ${state === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
              ${state === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
              ${state === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
              ${state === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>
              <span><span className="font-mono2 font-semibold mr-3 opacity-60">{String.fromCharCode(65 + i)}</span>{o}</span>
              {state === "right" && <CheckCircle2 size={17} className="shrink-0" />}
              {state === "wrong" && <XCircle size={17} className="shrink-0" />}
            </button>
          );
        })}
      </div>
      {sel !== null && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-600/10 text-sm rise">
          <p className="font-semibold text-rose-600 flex items-center gap-1.5 mb-1"><Lightbulb size={14} /> {t("Explication")}</p>
          <p className={c.sub}>{q.exp}</p>
          <Btn small variant="ghost" className="mt-4" icon={ArrowRight} onClick={() => nav(q.route)}>{t(isGrammar ? "Pratiquer la grammaire" : "Pratiquer le vocabulaire")}</Btn>
        </div>
      )}
    </Card>
  );
}
