import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ArrowRight, RotateCcw, Trophy, PenLine, ListChecks, Flag } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn, ProgressBar } from "@/components/common";
import { ConjugationExercise } from "@/components/conjugation/ConjugationExercise";
import { ConjugationQuotaWall } from "@/components/conjugation/ConjugationQuotaWall";
import { ALL_CONJUGATION_QS, CONJ_SECTION, conjQuizKey } from "@/constants/conjugation";
import { recordQuizResult } from "@/services/quizResultsService";

// How many exercises make one scored session. Short enough to finish in a
// break, long enough for the percentage to mean something.
const SESSION_LENGTH = 10;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// A scored run of SESSION_LENGTH exercises, drawn without repetition from one
// tense (`tense` given) or from every tense at once (the global "Mode quiz").
//
// The finished session is recorded through quizResultsService exactly like a
// bank quiz — same table, same localStorage fallback — under section "conj",
// which is what lets progressService keep conjugation out of the CO/CE
// averages while still counting it for the streak and the study clock.
//
// `blocked` means a free account ran out of daily minutes DURING this session.
// The set is deliberately allowed to finish and be scored anyway — the page
// only ever puts the paywall up at a session boundary, so nobody loses seven
// answered questions to a clock. The wall then appears under the score, in
// place of "Nouvelle série". `onSessionOpen` tells the page a set is live, so
// it knows this is not a boundary.
export function ConjugationQuiz({ tense, mode, onModeChange, blocked = false, resetAt, onSessionOpen }) {
  const { c, t, user } = useApp();
  const pool = useMemo(
    () => (tense ? tense.qs.map((q) => ({ ...q, tense: tense.t })) : ALL_CONJUGATION_QS),
    [tense],
  );

  const draw = useCallback(() => shuffle(pool).slice(0, Math.min(SESSION_LENGTH, pool.length)), [pool]);

  const [round, setRound] = useState(0); // bumped to force a fresh exercise state
  const [items, setItems] = useState(draw);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const startedAt = useRef(Date.now());

  // Switching tense swaps the pool under a live session; start a clean one
  // rather than scoring the new questions against the old run.
  useEffect(() => {
    setItems(draw());
    setIndex(0);
    setScore(0);
    startedAt.current = Date.now();
  }, [draw]);

  // Mounting is the page's signal that a set is under way. It only ever
  // mounts this component at a boundary it has already cleared, so there is
  // nothing to un-signal on the way out.
  useEffect(() => { onSessionOpen?.(); }, [onSessionOpen]);

  const item = items[index];
  const finished = index >= items.length;

  const record = useCallback((ok) => {
    recordQuizResult(user?.id, {
      quizKey: conjQuizKey(tense ? tense.id : "mixte"),
      section: CONJ_SECTION,
      ok,
      total: items.length,
      answered: items.length,
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
    });
  }, [user?.id, tense, items.length]);

  const answer = (correct) => setScore((s) => s + (correct ? 1 : 0));

  // Recorded here, in the click handler, rather than in an effect on `finished`:
  // an effect would fire twice under StrictMode and write the session twice.
  const next = () => {
    const n = index + 1;
    if (n >= items.length) record(score);
    setIndex(n);
  };

  const restart = () => {
    setItems(draw());
    setIndex(0);
    setScore(0);
    startedAt.current = Date.now();
    setRound((r) => r + 1);
  };

  if (finished) return <SessionReport score={score} total={items.length} onRestart={restart} blocked={blocked} resetAt={resetAt} />;

  const pct = Math.round((index / items.length) * 100);

  return (
    <Card className="p-6 sm:p-7 rise">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Pill tone="blue">{item.tense}</Pill>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 text-sm font-mono2 font-semibold ${c.sub}`}>
            <Trophy size={14} className="text-amber-500" aria-hidden="true" /> {score}/{index}
          </span>
          <ModeToggle mode={mode} onChange={onModeChange} />
        </div>
      </div>

      <div className="mt-4 mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-semibold ${c.faint}`}>{t("Question")} {index + 1} / {items.length}</span>
        </div>
        <ProgressBar pct={pct} />
      </div>

      {/* key: a fresh exercise state (input, verdict) for every question */}
      <ConjugationExercise key={`${round}-${index}`} q={item} mode={mode} onAnswer={answer} autoFocus />

      <div className="mt-5 flex items-center gap-3">
        <Btn small icon={index + 1 >= items.length ? Flag : ArrowRight} onClick={next}>
          {t(index + 1 >= items.length ? "Voir le résultat" : "Question suivante")}
        </Btn>
        <Btn small variant="ghost" icon={RotateCcw} onClick={restart}>{t("Recommencer")}</Btn>
      </div>
    </Card>
  );
}

// Écrire / Choisir. Lives here rather than in the page because the session
// keeps its score across a mode switch — a candidate who finds typing too hard
// mid-session should be able to fall back without losing their run.
export function ModeToggle({ mode, onChange }) {
  const { c, t } = useApp();
  const opts = [
    { id: "write", label: "Écrire", Icon: PenLine },
    { id: "choose", label: "Choisir", Icon: ListChecks },
  ];
  return (
    <div className={`inline-flex p-1 rounded-full border ${c.border}`} role="group" aria-label={t("Mode de réponse")}>
      {opts.map((o) => (
        <button
          key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={mode === o.id}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${mode === o.id ? "bg-blue-600 text-white" : `${c.sub} ${c.hoverSoft}`}`}
        >
          <o.Icon size={13} aria-hidden="true" /> {t(o.label)}
        </button>
      ))}
    </div>
  );
}

function SessionReport({ score, total, onRestart, blocked, resetAt }) {
  const { c, t } = useApp();
  const pct = Math.round((score / total) * 100);
  const verdict =
    pct >= 90 ? { tone: "green", msg: "Excellent — ce temps est acquis." }
      : pct >= 70 ? { tone: "blue", msg: "Bon niveau. Encore quelques formes à fixer." }
        : pct >= 50 ? { tone: "amber", msg: "En progrès. Relisez la leçon, puis recommencez." }
          : { tone: "red", msg: "À retravailler : reprenez la leçon avant de refaire une série." };

  return (
    <div className="space-y-4">
      <Card className="p-8 text-center rise">
        <Trophy size={32} className="mx-auto text-amber-500" aria-hidden="true" />
        <p className={`mt-4 font-display font-black text-4xl ${c.text}`}>{pct} %</p>
        <p className={`mt-1 text-sm ${c.sub}`}>{score} / {total} {t("bonnes réponses")}</p>
        <div className="mt-4 flex justify-center"><Pill tone={verdict.tone}>{t(verdict.msg)}</Pill></div>
        {/* The score is shown either way. Only the invitation to go again is
            withheld — the set that was already under way was never in doubt. */}
        {!blocked && (
          <div className="mt-6 flex justify-center">
            <Btn icon={RotateCcw} onClick={onRestart}>{t("Nouvelle série")}</Btn>
          </div>
        )}
      </Card>
      {blocked && <ConjugationQuotaWall resetAt={resetAt} />}
    </div>
  );
}
