import { useEffect, useRef, useState } from "react";
import { XCircle, CheckCircle2, Bookmark, Upload, Lightbulb, ArrowRight, ArrowLeft, Flag, AlertTriangle, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, ProgressBar, Btn, TimerChip } from "@/components/common";
import { QuizReport } from "@/components/quiz/QuizReport";
import { useCountdown } from "@/hooks/useCountdown";
import { recordQuizResult } from "@/services/quizResultsService";
import { recordAttempts } from "@/services/questionAnalyticsService";
import { fmt } from "@/utils/format";
import { preloadImages } from "@/utils/imagePreload";

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
// Exam-runner extras (deferResults only):
// - examLayout: 3-column exam view (palette | question | candidate + timer)
// - candidate: { nom, pays, type, date } shown in the side panel
// - oneWay: test mode — no navigating back to earlier questions
// - autoAdvance: real-exam CO test mode — audio auto-plays, then the question
//   moves on by itself; no manual navigation and the palette is read-only
export function Quiz({ questions, duration, storageKey, above, renderAbove, doneExtra, deferResults, initialPicks, initialIndex, onProgress, onComplete, hideReport, examLayout, candidate, oneWay, autoAdvance }) {
  const { c, user, bookmarks, toggleBookmark, notify } = useApp();
  const [i, setI] = useState(initialIndex || 0);
  const [sel, setSel] = useState(null); // instant mode: current selection (locks the question)
  const [picks, setPicks] = useState(initialPicks || {}); // exam mode: question index -> chosen option
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [advanceIn, setAdvanceIn] = useState(null); // autoAdvance: seconds until the question moves on, or null

  // The countdown captures its callback once, so read live state via refs.
  const picksRef = useRef(picks);
  picksRef.current = picks;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Prefetch every question's image up front so navigating to the next
  // question renders it from cache instead of loading (and flashing) one by one.
  useEffect(() => {
    preloadImages(questions.map((qq) => qq.image).filter(Boolean));
  }, [questions]);

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
    // Per-question analytics for every question that carries an id (bank &
    // admin questions do; the editor preview is excluded). Time is the
    // per-question share of the time spent — an honest approximation, since
    // the engine times the whole quiz, not each question.
    if (!storageKey?.startsWith("preview-")) {
      const answeredMs = finalAnswers.length ? Math.round(((duration - left) * 1000) / finalAnswers.length) : null;
      const byIndex = new Map(finalAnswers.map((a) => [a.i, a]));
      recordAttempts(
        user?.id,
        questions
          .map((q, idx) => {
            if (q.id == null) return null;
            const a = byIndex.get(idx);
            return { questionId: q.id, answered: !!a, correct: a ? a.ok : null, durationMs: a ? answeredMs : null };
          })
          .filter(Boolean)
      );
    }
    setAnswers(finalAnswers);
    setFinished(true);
    onComplete?.({ answers: finalAnswers, ok, total: questions.length, answered: finalAnswers.length });
  };

  const [left, setLeft] = useCountdown(duration, !finished, () =>
    finishWith(deferResults ? buildExamAnswers(picksRef.current) : answersRef.current)
  );

  const restart = () => { setI(0); setSel(null); setPicks({}); setAnswers([]); setLeft(duration); setFinished(false); setConfirmFinish(false); };

  // ---- autoAdvance (real-exam CO test mode): audio ends → question moves on ----
  const ANSWER_WINDOW = 5; // seconds to lock in the answer after the audio ends
  // Move to the next question by itself, or submit the épreuve on the last one.
  const autoNext = () => {
    setConfirmFinish(false);
    if (i + 1 < questions.length) { setI(i + 1); onProgress?.({ picks: picksRef.current, index: i + 1, left }); }
    else finishWith(buildExamAnswers(picksRef.current));
  };
  // New question: clear any pending countdown. A question with no audio can't
  // fire onEnded, so start the window immediately.
  useEffect(() => {
    if (!autoAdvance) { setAdvanceIn(null); return; }
    if (!questions[i]?.audio) { setAdvanceIn(ANSWER_WINDOW); return; }
    setAdvanceIn(null);
    // Safety net: if autoplay is blocked and the clip never fires onEnded (no
    // manual control exists in this mode), move on anyway after a hard cap.
    const fb = setTimeout(() => setAdvanceIn((v) => (v == null ? ANSWER_WINDOW : v)), 120000);
    return () => clearTimeout(fb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, autoAdvance]);
  // Tick the countdown; advance when it reaches zero.
  useEffect(() => {
    if (advanceIn == null) return;
    if (advanceIn <= 0) { autoNext(); setAdvanceIn(null); return; }
    const id = setTimeout(() => setAdvanceIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceIn]);

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

  const goTo = (idx) => {
    if (oneWay && idx < i) return; // test mode: no going back
    setI(idx); setConfirmFinish(false); onProgress?.({ picks, index: idx, left });
  };
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

  // The audio player calls this when the clip finishes (or fails to load).
  const onAudioEnded = () => { if (autoAdvance) setAdvanceIn((v) => (v == null ? ANSWER_WINDOW : v)); };

  // ---- shared building blocks (arranged differently per layout) ----
  const bookmarkBtn = (
    <button onClick={() => { toggleBookmark(key); notify(marked ? "Signet retiré." : "Question ajoutée à vos signets."); }} aria-label={marked ? "Retirer le signet" : "Marquer cette question"} aria-pressed={marked} title="Marquer pour y revenir" className={`p-2 rounded-full ${marked ? "bg-amber-500/15 text-amber-500" : `${c.hoverSoft} ${c.faint}`}`}>
      <Bookmark size={17} fill={marked ? "currentColor" : "none"} />
    </button>
  );

  const paletteButton = (idx, layout) => {
    const st = paletteState(idx);
    const flagged = bookmarks.includes(`${storageKey}-${idx}`);
    const locked = autoAdvance || (oneWay && idx < i);
    const shape = layout === "row" ? "relative w-full py-2.5 rounded-xl" : "relative w-9 h-9 rounded-lg";
    return (
      <button key={idx} onClick={() => goTo(idx)} disabled={locked} aria-label={`Aller à la question ${idx + 1}`} aria-current={st === "current" ? "true" : undefined}
        className={`${shape} border text-xs font-mono2 font-bold transition-all ${locked ? "opacity-40 cursor-not-allowed" : "hover:border-blue-600"}
        ${st === "current" ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25" : ""}
        ${st === "answered" ? "border-blue-600/60 bg-blue-600/10 text-blue-600" : ""}
        ${st === "todo" ? `${c.border} ${c.faint}` : ""}`}>
        {idx + 1}
        {flagged && <Flag size={9} className={`absolute text-amber-500 ${layout === "row" ? "top-1.5 right-2" : "-top-1 -right-1"}`} fill="currentColor" />}
      </button>
    );
  };

  // Compact wrapping grid (default quiz layout) and one-per-line list (exam).
  const paletteEl = (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Navigation entre les questions">
      {questions.map((_, idx) => paletteButton(idx, "grid"))}
    </div>
  );
  const examPaletteEl = (
    <div className="space-y-1.5" role="list" aria-label="Navigation entre les questions">
      {questions.map((_, idx) => paletteButton(idx, "row"))}
    </div>
  );

  const optionsEl = (
    <div className="space-y-2.5">
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
  );

  const examNavEl = (
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
        {oneWay ? <span /> : <Btn small variant="ghost" icon={ArrowLeft} disabled={i === 0} onClick={() => goTo(i - 1)}>Précédente</Btn>}
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
  );

  const instantEl = sel !== null && (
    <div className="mt-5 p-5 rounded-2xl bg-blue-600/10 rise">
      <p className="font-semibold text-sm text-blue-600 flex items-center gap-1.5 mb-1.5"><Lightbulb size={15} /> Explication</p>
      <p className={`text-sm leading-relaxed ${c.sub}`}>{q.exp || "Aucune explication fournie pour cette question importée."}</p>
      <Btn small className="mt-4" icon={ArrowRight} onClick={advance}>
        {i + 1 >= questions.length ? "Voir mon score" : "Question suivante"}
      </Btn>
    </div>
  );

  // ---- exam layout: palette · question · candidate + big timer ----
  if (examLayout) {
    const low = left <= 60;
    const row = (label, value) => (
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs shrink-0 ${c.faint}`}>{label}</span>
        <span className={`text-sm font-semibold flex-1 min-w-0 truncate text-right ${c.text}`} title={value || undefined}>{value || "—"}</span>
      </div>
    );
    return (
      <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)_248px] items-start">
        {/* palette */}
        <Card className="p-4 order-2 lg:order-1 lg:sticky lg:top-24">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Questions</p>
          <p className={`text-xs mt-0.5 ${c.faint}`}>{answeredCount} / {questions.length} répondues</p>
          <div className="mt-2"><ProgressBar pct={(answeredCount / questions.length) * 100} /></div>
          <div className="mt-4 lg:max-h-[58vh] lg:overflow-y-auto -mr-1 pr-1">{examPaletteEl}</div>
        </Card>

        {/* question */}
        <div className="order-1 lg:order-2 min-w-0 space-y-4">
          {renderAbove ? renderAbove(q, i, { autoPlay: !!autoAdvance, onAudioEnded }) : above}
          <Card className="p-6 md:p-7">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="slate">Question {i + 1} / {questions.length}</Pill>
                {q.level && <Pill tone="blue">Niveau {q.level}</Pill>}
              </div>
              {!autoAdvance && bookmarkBtn}
            </div>
            {q.q && <div className={`px-4 py-3 rounded-2xl bg-blue-600/5 border-l-4 border-blue-600/50 text-sm font-medium mb-5 ${c.text}`}>{q.q}</div>}
            {optionsEl}
            {autoAdvance ? (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-center">
                {advanceIn == null ? (
                  <span className={c.faint}>Le document n'est joué qu'une fois — passage automatique à la question suivante.</span>
                ) : (
                  <><span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" /><span className="font-semibold text-blue-600">{i + 1 < questions.length ? `Question suivante dans ${advanceIn}s…` : `Fin de l'épreuve dans ${advanceIn}s…`}</span></>
                )}
              </div>
            ) : examNavEl}
          </Card>
        </div>

        {/* candidate + big timer */}
        <div className="order-3 space-y-4 lg:sticky lg:top-24">
          {candidate && (
            <Card className="overflow-hidden">
              <div className="grad-brand py-6 flex justify-center">
                <span className="w-14 h-14 rounded-full bg-white/95 text-blue-600 flex items-center justify-center shadow-lg"><User size={26} /></span>
              </div>
              <div className="p-5 space-y-3">
                {row("Nom", candidate.nom)}
                {row("Pays", candidate.pays)}
                {row("Type", candidate.type)}
                {row("Date", candidate.date)}
              </div>
            </Card>
          )}
          <Card className="p-5 text-center">
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${low ? "text-rose-600" : "text-blue-600"}`}>Temps restant</p>
            <p className={`font-display font-extrabold text-4xl font-mono2 ${low ? "text-rose-600" : "grad-text"}`}>{fmt(Math.max(0, left))}</p>
            <div className="mt-3"><ProgressBar pct={(left / duration) * 100} tone="grad" /></div>
          </Card>
        </div>
      </div>
    );
  }

  // ---- default single-column layout ----
  return (
    <div className="space-y-5">
      {renderAbove ? renderAbove(q, i, { autoPlay: !!autoAdvance, onAudioEnded }) : above}
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
            {bookmarkBtn}
          </div>
        </div>
        <ProgressBar pct={(answeredCount / questions.length) * 100} />
        {deferResults && <div className="mt-5">{paletteEl}</div>}
        <p className={`mt-6 leading-relaxed font-medium ${c.text}`}>{q.q}</p>
        <div className="mt-5">{optionsEl}</div>
        {deferResults ? examNavEl : instantEl}
      </Card>
    </div>
  );
}
