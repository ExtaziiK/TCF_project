import { useRef, useState } from "react";
import { XCircle, CheckCircle2, Bookmark, Upload, Lightbulb, ArrowRight, ArrowLeft, Flag, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, ProgressBar, Btn, TimerChip } from "@/components/common";
import { QuizReport } from "@/components/quiz/QuizReport";
import { useCountdown } from "@/hooks/useCountdown";
import { recordQuizResult } from "@/services/quizResultsService";

// Mock-exam quiz tasks (storageKey "mock-<attemptId>-<order>") are already
// tracked in full by examService's exam_attempts table - recording them here
// too would double-count exercises/study-time in dashboard stats.
const inferSection = (storageKey) => /^bank-(co|ce|ee|eo)-/.exec(storageKey || "")?.[1] || null;

// Two modes:
// - instant (default): one question at a time, the correction and the
//   explanation appear as soon as an option is chosen, then "suivante".
// - deferResults (exam mode, used by the bank quizzes): free navigation
//   between questions (palette + précédente/suivante), answers stay
//   changeable, questions can be skipped, and nothing is corrected until
//   the candidate submits — like the real computer-based TCF.
//
// Embedding hooks (all optional, used by the mock-exam runner):
// - initialPicks / initialIndex resume a previously saved exam session
// - onProgress({ picks, index, left }) fires on every answer / navigation
// - onComplete({ answers, ok, total }) fires at submission
// - hideReport: render nothing once finished (the caller owns the report)
export function Quiz({ questions, duration, storageKey, above, renderAbove, doneExtra, deferResults, initialPicks, initialIndex, onProgress, onComplete, hideReport }) {
  const { c, user, bookmarks, toggleBookmark, notify } = useApp();
  const [i, setI] = useState(initialIndex || 0);
  const [sel, setSel] = useState(null); // instant mode: current selection (locks the question)
  const [picks, setPicks] = useState(initialPicks || {}); // exam mode: question index -> chosen option
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  // The countdown captures its callback once, so read live state via refs.
  const picksRef = useRef(picks);
  picksRef.current = picks;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const buildExamAnswers = (p) =>
    Object.entries(p).map(([idx, s]) => ({ i: +idx, sel: s, ok: s === questions[+idx].a }));

  const finishWith = (finalAnswers) => {
    const ok = finalAnswers.filter((a) => a.ok).length;
    if (!storageKey?.startsWith("mock-")) {
      recordQuizResult(user?.id, {
        quizKey: storageKey,
        section: inferSection(storageKey),
        ok,
        total: questions.length,
        answered: finalAnswers.length, // questions with a selected answer (skips excluded)
        durationSec: Math.max(0, duration - left),
      });
    }
    setAnswers(finalAnswers);
    setFinished(true);
    onComplete?.({ answers: finalAnswers, ok, total: questions.length });
  };

  const [left, setLeft] = useCountdown(duration, !finished, () =>
    finishWith(deferResults ? buildExamAnswers(picksRef.current) : answersRef.current)
  );

  const restart = () => { setI(0); setSel(null); setPicks({}); setAnswers([]); setLeft(duration); setFinished(false); setConfirmFinish(false); };

  if (finished) {
    if (hideReport) return null;
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
  const answeredCount = deferResults ? Object.keys(picks).length : answers.length;
  const unanswered = questions.length - answeredCount;
  const currentSel = deferResults ? (picks[i] ?? null) : sel;

  const goTo = (idx) => { setI(idx); setConfirmFinish(false); onProgress?.({ picks, index: idx, left }); };
  const attemptFinish = () => {
    if (unanswered > 0) setConfirmFinish(true);
    else finishWith(buildExamAnswers(picks));
  };

  // instant mode only: advance after the correction has been read
  const advance = () => {
    if (i + 1 >= questions.length) finishWith(answers);
    else { setI(i + 1); setSel(null); }
  };

  const choose = (idx) => {
    if (deferResults) {
      const next = { ...picks, [i]: idx };
      setPicks(next);
      onProgress?.({ picks: next, index: i, left });
      return;
    }
    if (sel !== null) return;
    setSel(idx);
    setAnswers((a) => [...a, { i, sel: idx, ok: idx === q.a }]);
  };

  const paletteState = (idx) => {
    if (idx === i) return "current";
    return picks[idx] !== undefined ? "answered" : "todo";
  };

  return (
    <div className="space-y-5">
      {renderAbove ? renderAbove(q, i) : above}
      <Card className="p-6 md:p-7">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone="slate">Question {i + 1} / {questions.length}</Pill>
            <Pill tone={unanswered === 0 ? "green" : "blue"}>{answeredCount} / {questions.length} répondue{answeredCount > 1 ? "s" : ""}</Pill>
            {q.level && <Pill tone="blue">Niveau {q.level}</Pill>}
            {q.custom && <Pill tone="amber"><Upload size={11} /> Importée</Pill>}
          </div>
          <div className="flex items-center gap-2">
            <TimerChip left={left} total={duration} />
            <button onClick={() => { toggleBookmark(key); notify(marked ? "Signet retiré." : "Question ajoutée à vos signets."); }} aria-label={marked ? "Retirer le signet" : "Marquer cette question"} aria-pressed={marked} title="Marquer pour y revenir" className={`p-2 rounded-full ${marked ? "bg-amber-500/15 text-amber-500" : `${c.hoverSoft} ${c.faint}`}`}>
              <Bookmark size={17} fill={marked ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        <ProgressBar pct={(answeredCount / questions.length) * 100} />

        {deferResults && (
          <div className="mt-5 flex flex-wrap gap-1.5" role="list" aria-label="Navigation entre les questions">
            {questions.map((_, idx) => {
              const st = paletteState(idx);
              const flagged = bookmarks.includes(`${storageKey}-${idx}`);
              return (
                <button key={idx} onClick={() => goTo(idx)} aria-label={`Aller à la question ${idx + 1}`} aria-current={st === "current" ? "true" : undefined}
                  className={`relative w-9 h-9 rounded-lg border text-xs font-mono2 font-bold transition-all hover:border-blue-600
                  ${st === "current" ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25" : ""}
                  ${st === "answered" ? "border-blue-600/60 bg-blue-600/10 text-blue-600" : ""}
                  ${st === "todo" ? `${c.border} ${c.faint}` : ""}`}>
                  {idx + 1}
                  {flagged && <Flag size={9} className="absolute -top-1 -right-1 text-amber-500" fill="currentColor" />}
                </button>
              );
            })}
          </div>
        )}

        <p className={`mt-6 leading-relaxed font-medium ${c.text}`}>{q.q}</p>
        <div className="mt-5 space-y-2.5">
          {q.opts.map((o, idx) => {
            const state = deferResults
              ? (idx === currentSel ? "chosen" : "idle")
              : currentSel === null ? "idle" : idx === q.a ? "right" : idx === currentSel ? "wrong" : "dim";
            return (
              <button key={idx} disabled={!deferResults && sel !== null}
                onClick={() => choose(idx)}
                aria-pressed={deferResults ? idx === currentSel : undefined}
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
          <>
            {confirmFinish && (
              <div className="mt-5 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 rise">
                <p className="font-semibold text-sm text-amber-600 flex items-center gap-1.5"><AlertTriangle size={15} /> Il vous reste {unanswered} question{unanswered > 1 ? "s" : ""} sans réponse</p>
                <p className={`text-sm mt-1 ${c.sub}`}>Les questions sans réponse compteront comme non acquises dans votre score.</p>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Btn small variant="ghost" onClick={() => setConfirmFinish(false)}>Continuer le quiz</Btn>
                  <Btn small variant="accent" onClick={() => finishWith(buildExamAnswers(picks))}>Terminer quand même</Btn>
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
              <Btn small variant="ghost" icon={ArrowLeft} disabled={i === 0} onClick={() => goTo(i - 1)}>Précédente</Btn>
              <div className="flex items-center gap-2 flex-wrap">
                {unanswered === 0 && i + 1 < questions.length && (
                  <Btn small variant="ghost" onClick={attemptFinish}>Terminer le quiz</Btn>
                )}
                {i + 1 < questions.length ? (
                  <Btn small icon={ArrowRight} onClick={() => goTo(i + 1)}>{currentSel === null ? "Passer" : "Suivante"}</Btn>
                ) : (
                  <Btn small variant="accent" icon={CheckCircle2} onClick={attemptFinish}>Terminer le quiz</Btn>
                )}
              </div>
            </div>
          </>
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
