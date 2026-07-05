import { useState } from "react";
import { XCircle, CheckCircle2, Bookmark, Upload, Lightbulb, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, ProgressBar, Btn, TimerChip } from "@/components/common";
import { QuizReport } from "@/components/quiz/QuizReport";
import { useCountdown } from "@/hooks/useCountdown";

// deferResults: exam mode — the selection stays changeable, no correction is
// shown during the quiz, and answers are only revealed in the final report.
export function Quiz({ questions, duration, storageKey, above, renderAbove, doneExtra, deferResults }) {
  const { c, bookmarks, toggleBookmark, notify } = useApp();
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [left, setLeft] = useCountdown(duration, !finished, () => setFinished(true));

  const restart = () => { setI(0); setSel(null); setAnswers([]); setLeft(duration); setFinished(false); };
  const advance = () => {
    if (deferResults) setAnswers((a) => [...a, { i, sel, ok: sel === questions[i].a }]);
    if (i + 1 >= questions.length) setFinished(true);
    else { setI(i + 1); setSel(null); }
  };

  if (finished) {
    return (
      <QuizReport
        questions={questions}
        answers={answers}
        duration={duration}
        left={left}
        onRestart={restart}
        doneExtra={doneExtra}
        renderAbove={renderAbove}
        above={above}
      />
    );
  }

  const q = questions[i];
  const key = `${storageKey}-${i}`;
  const marked = bookmarks.includes(key);

  return (
    <div className="space-y-5">
      {renderAbove ? renderAbove(q, i) : above}
      <Card className="p-6 md:p-7">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <div className="flex items-center gap-2">
            <Pill tone="slate">Question {i + 1} / {questions.length}</Pill>
            {q.level && <Pill tone="blue">Niveau {q.level}</Pill>}
            {q.custom && <Pill tone="amber"><Upload size={11} /> Importée</Pill>}
          </div>
          <div className="flex items-center gap-2">
            <TimerChip left={left} total={duration} />
            <button onClick={() => { toggleBookmark(key); notify(marked ? "Signet retiré." : "Question ajoutée à vos signets."); }} aria-label={marked ? "Retirer le signet" : "Ajouter aux signets"} aria-pressed={marked} className={`p-2 rounded-full ${marked ? "bg-amber-500/15 text-amber-500" : `${c.hoverSoft} ${c.faint}`}`}>
              <Bookmark size={17} fill={marked ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        <ProgressBar pct={(i / questions.length) * 100} />
        <p className={`mt-6 leading-relaxed font-medium ${c.text}`}>{q.q}</p>
        <div className="mt-5 space-y-2.5">
          {q.opts.map((o, idx) => {
            const state = deferResults
              ? (idx === sel ? "chosen" : "idle")
              : sel === null ? "idle" : idx === q.a ? "right" : idx === sel ? "wrong" : "dim";
            return (
              <button key={o} disabled={!deferResults && sel !== null}
                onClick={() => { setSel(idx); if (!deferResults) setAnswers((a) => [...a, { i, sel: idx, ok: idx === q.a }]); }}
                aria-pressed={deferResults ? idx === sel : undefined}
                className={`w-full text-left px-5 py-3.5 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between gap-3
                ${state === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
                ${state === "chosen" ? "border-blue-600 bg-blue-600/10 text-blue-600" : ""}
                ${state === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
                ${state === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
                ${state === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>
                <span><span className="font-mono2 font-semibold mr-3 opacity-60">{String.fromCharCode(65 + idx)}</span>{o}</span>
                {state === "chosen" && <CheckCircle2 size={18} className="shrink-0" />}
                {state === "right" && <CheckCircle2 size={18} className="shrink-0" />}
                {state === "wrong" && <XCircle size={18} className="shrink-0" />}
              </button>
            );
          })}
        </div>
        {deferResults ? (
          sel !== null && (
            <div className="mt-5 flex justify-end rise">
              <Btn small icon={ArrowRight} onClick={advance}>
                {i + 1 >= questions.length ? "Voir mon score" : "Question suivante"}
              </Btn>
            </div>
          )
        ) : (
          sel !== null && (
            <div className="mt-5 p-5 rounded-2xl bg-blue-600/10 rise">
              <p className="font-semibold text-sm text-blue-600 flex items-center gap-1.5 mb-1.5"><Lightbulb size={15} /> Explication</p>
              <p className={`text-sm leading-relaxed ${c.sub}`}>{q.exp || "Aucune explication fournie pour cette question importée."}</p>
              <Btn small className="mt-4" icon={ArrowRight} onClick={advance}>
                {i + 1 >= questions.length ? "Voir mon score" : "Question suivante"}
              </Btn>
            </div>
          )
        )}
      </Card>
    </div>
  );
}
