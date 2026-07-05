import { useState } from "react";
import {
  Trophy, XCircle, CheckCircle2, RotateCcw, ChevronLeft,
  Lightbulb, LayoutGrid, MinusCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, ProgressBar, Btn } from "@/components/common";
import { fmt } from "@/utils/format";

// End-of-quiz report: score, clickable question grid, full correction with
// every explanation, and a per-question review mode that replays the media.
export function QuizReport({ questions, answers, duration, left, onRestart, doneExtra, renderAbove, above }) {
  const { c } = useApp();
  const [reviewIdx, setReviewIdx] = useState(null);
  const byIndex = new Map(answers.map((a) => [a.i, a]));
  const ok = answers.filter((a) => a.ok).length;
  const wrongCount = answers.length - ok;
  const skipped = questions.length - answers.length;
  const pct = Math.round((ok / questions.length) * 100);
  const est = pct >= 85 ? "B2+" : pct >= 65 ? "B2" : pct >= 40 ? "B1" : "A2";

  const statusOf = (idx) => {
    const a = byIndex.get(idx);
    return !a ? "skipped" : a.ok ? "right" : "wrong";
  };

  /* ---- review mode: one question, with media, answers and explanation ---- */
  if (reviewIdx !== null) {
    const q = questions[reviewIdx];
    const a = byIndex.get(reviewIdx);
    return (
      <div className="space-y-5 rise">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button onClick={() => setReviewIdx(null)} className="text-sm font-semibold text-blue-600 flex items-center gap-1">
            <ChevronLeft size={15} /> Retour au rapport
          </button>
          <div className="flex items-center gap-2">
            <Btn small variant="ghost" disabled={reviewIdx === 0} onClick={() => setReviewIdx(reviewIdx - 1)}>Précédente</Btn>
            <Pill tone="slate">{reviewIdx + 1} / {questions.length}</Pill>
            <Btn small variant="ghost" disabled={reviewIdx === questions.length - 1} onClick={() => setReviewIdx(reviewIdx + 1)}>Suivante</Btn>
          </div>
        </div>
        {renderAbove ? renderAbove(q, reviewIdx) : above}
        <Card className="p-6 md:p-7">
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <Pill tone="slate">Question {reviewIdx + 1}</Pill>
            {statusOf(reviewIdx) === "right" && <Pill tone="green"><CheckCircle2 size={12} /> Réussie</Pill>}
            {statusOf(reviewIdx) === "wrong" && <Pill tone="red"><XCircle size={12} /> Manquée</Pill>}
            {statusOf(reviewIdx) === "skipped" && <Pill tone="amber"><MinusCircle size={12} /> Sans réponse</Pill>}
          </div>
          <p className={`leading-relaxed font-medium ${c.text}`}>{q.q}</p>
          <div className="mt-5 space-y-2.5">
            {q.opts.map((o, idx) => {
              const isCorrect = idx === q.a;
              const isUser = a && idx === a.sel;
              return (
                <div key={o} className={`px-5 py-3.5 rounded-2xl border text-sm font-medium flex items-center justify-between gap-3
                  ${isCorrect ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : isUser ? "border-rose-500 bg-rose-500/10 text-rose-600" : `${c.border} opacity-50 ${c.sub}`}`}>
                  <span><span className="font-mono2 font-semibold mr-3 opacity-60">{String.fromCharCode(65 + idx)}</span>{o}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {isUser && <Pill tone={isCorrect ? "green" : "red"}>Votre réponse</Pill>}
                    {isCorrect && <CheckCircle2 size={18} />}
                    {isUser && !isCorrect && <XCircle size={18} />}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 p-5 rounded-2xl bg-blue-600/10">
            <p className="font-semibold text-sm text-blue-600 flex items-center gap-1.5 mb-1.5"><Lightbulb size={15} /> Explication</p>
            <p className={`text-sm leading-relaxed ${c.sub}`}>{q.exp || "Aucune explication fournie pour cette question. Réécoutez le document en suivant la bonne réponse pour comprendre ce qui vous a échappé."}</p>
          </div>
        </Card>
      </div>
    );
  }

  /* ---- score report ---- */
  return (
    <Card className="p-7 rise">
      <div className="text-center">
        <Trophy size={36} className="text-amber-500 mx-auto" />
        <h3 className={`font-display font-bold text-2xl mt-3 ${c.text}`}>Rapport de score</h3>
        <p className={`mt-1 text-sm ${c.sub}`}>Terminé en {fmt(duration - left)} · niveau estimé sur cette série : <span className="font-bold text-blue-600">{est}</span></p>
        <p className="font-display font-extrabold text-5xl mt-5 grad-text">{ok} / {questions.length}</p>
        <div className="max-w-xs mx-auto mt-4"><ProgressBar pct={pct} tone="grad" /></div>
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <Pill tone="green"><CheckCircle2 size={12} /> {ok} bonne{ok > 1 ? "s" : ""} réponse{ok > 1 ? "s" : ""}</Pill>
          <Pill tone="red"><XCircle size={12} /> {wrongCount} erreur{wrongCount > 1 ? "s" : ""}</Pill>
          {skipped > 0 && <Pill tone="amber"><MinusCircle size={12} /> {skipped} sans réponse</Pill>}
        </div>
      </div>

      <div className="mt-9">
        <h4 className={`font-semibold text-sm mb-1.5 flex items-center gap-2 ${c.text}`}><LayoutGrid size={16} className="text-blue-600" /> Revoir les questions</h4>
        <p className={`text-sm mb-4 ${c.sub}`}>Cliquez un numéro pour rouvrir la question : réécoutez l'audio, revoyez votre réponse et lisez l'explication.</p>
        <div className="flex flex-wrap gap-2" role="list" aria-label="Questions du quiz">
          {questions.map((_, idx) => {
            const st = statusOf(idx);
            return (
              <button key={idx} onClick={() => setReviewIdx(idx)} aria-label={`Revoir la question ${idx + 1}`}
                className={`w-10 h-10 rounded-xl border text-sm font-mono2 font-bold transition-all hover:scale-105 hover:border-blue-600
                ${st === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
                ${st === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
                ${st === "skipped" ? `${c.border} ${c.faint}` : ""}`}>
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex gap-3 justify-center flex-wrap">
        <Btn icon={RotateCcw} onClick={onRestart}>Recommencer la série</Btn>
        {doneExtra}
      </div>
    </Card>
  );
}
