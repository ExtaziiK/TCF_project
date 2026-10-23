import { useEffect, useRef, useState } from "react";
import { Mic, Square, ChevronRight, Loader2, AlertCircle, Volume2, RotateCcw, MessageCircle, MicOff, NotebookPen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";
import { AiFeedback } from "@/components/expression/AiFeedback";
import { RefreshNotice } from "@/components/expression/RefreshNotice";
import { MicHelp } from "@/components/expression/MicHelp";
import { useOralInterview } from "@/hooks/useOralInterview";
import { fmt } from "@/utils/format";

// How each tâche runs, in the side panel before it starts.
const HOW_IT_WORKS = {
  1: [
    "L'examinateur parle en premier : il vous demande de vous présenter.",
    "Répondez à voix haute, puis répondez à ses questions de relance.",
    "Le chronomètre tourne en continu pendant 2 minutes, comme le jour de l'examen.",
    "À la fin, l'IA évalue l'ensemble de l'entretien.",
  ],
  2: [
    "Préparez-vous pendant 2 minutes : notez les questions à poser.",
    "C'est vous qui commencez : saluez, présentez votre demande, posez vos questions.",
    "L'interlocuteur vous répond avec des informations concrètes. Réagissez-y.",
    "L'échange dure 3 min 30, puis l'IA l'évalue en entier.",
  ],
  3: [
    "L'examinateur vous donne le sujet à l'oral.",
    "Donnez votre opinion et défendez-la avec des arguments et des exemples.",
    "Il peut vous objecter un autre point de vue : défendez ou nuancez votre position.",
    "L'épreuve dure 4 min 30, puis l'IA évalue l'ensemble.",
  ],
};

// One tâche of the Expression orale, run as on exam day (useOralInterview):
// the examiner speaks first where they do on exam day, the clock runs the
// whole time, and the exchange is graded at the end.
// `exam`: the TCF blanc — the text of what is said stays hidden until the
// end, as in the room you only hear it, and the feedback waits for the
// report; `onFinish({ feedback, ended })` hands the result to the exam, and
// `autoStart` begins the tâche as soon as it is shown.
export function OralInterview({ task, exam = false, autoStart = false, onFinish }) {
  const { c, notify, t } = useApp();
  const { phase, count, turns, feedback, ended, error, needsRefresh, micIssue, clearMicIssue, voiceless, remaining, interviewSecs, reviewSecs, begin, skipReview, answer, stop, replay, restart } = useOralInterview(task, notify, { exam });
  const [notes, setNotes] = useState("");
  const endRef = useRef(null);
  const reported = useRef(false);
  const examiner = task.task === 2 ? "Interlocuteur" : "Examinateur";
  // On exam day the Tâche 1 question is only asked out loud.
  const showSubject = !(exam && task.task === 1);
  const hideText = exam && phase !== "done" && !voiceless;

  // Keep the latest exchange in view as the dialogue grows.
  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, phase]);

  // The exam moves from one part to the next on the candidate's click, so
  // the next part starts right away (that click also lets its audio play).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoStart) begin(); }, []);

  useEffect(() => {
    if (phase !== "done" || reported.current) return;
    reported.current = true;
    onFinish?.({ feedback, ended });
  }, [phase, feedback, ended, onFinish]);

  const restartAll = () => { reported.current = false; setNotes(""); restart(); };

  return (
    <div className="grid lg:grid-cols-3 gap-5 rise">
      <Card className="lg:col-span-2 p-6 flex flex-col">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex gap-2 flex-wrap">
            <Pill tone="blue">{reviewSecs ? `${t("Préparation :")} ${fmt(reviewSecs)}` : t("Sans préparation")}</Pill>
            <Pill tone="red">{t("Temps de l'épreuve :")} {fmt(interviewSecs)}</Pill>
          </div>
          <Pill tone={remaining <= 30 ? "amber" : "slate"}>{t("Temps restant :")} {fmt(remaining)}</Pill>
        </div>

        {showSubject && (
          <div className={`p-4 rounded-2xl border-2 border-blue-600/30 mb-5 ${phase === "review" ? "ring-2 ring-blue-600/20" : ""}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wide text-blue-600 mb-1.5`}>{t("Sujet")}</p>
            <p className={`leading-relaxed font-medium ${c.text}`}>{task.prompt}</p>
          </div>
        )}

        {turns.length > 0 && (
          <div className="space-y-3 mb-5 max-h-[26rem] overflow-y-auto pr-1">
            {turns.map((tn, i) => (
              <DialogueBubble
                key={tn.id}
                turn={tn}
                who={examiner}
                hideText={hideText}
                speakingNow={phase === "speaking" && i === turns.length - 1}
                onReplay={!exam && (phase === "ready" || phase === "done") && tn.role === "examiner" ? () => replay(tn) : null}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}

        <MicHelp code={micIssue} onClose={clearMicIssue} task={task.task} />
        {error && (
          <p className="mb-4 text-sm font-semibold text-rose-600 flex items-start gap-1.5">
            <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}
        {needsRefresh && (
          <div className="mb-4">
            <RefreshNotice
              kind={needsRefresh}
              section="eo"
              task={task.task}
              copyLabel="Copier l'échange"
              copyText={turns
                .filter((tn) => tn.text && !tn.failed && !tn.emptyRec)
                .map((tn) => `${tn.role === "examiner" ? examiner : "Vous"} : ${tn.text}`)
                .join("\n\n")}
            />
          </div>
        )}

        <InterviewControls c={c} t={t} phase={phase} count={count} ended={ended} exam={exam} who={examiner} begin={begin} skipReview={skipReview} answer={answer} stop={stop} restart={exam ? null : restartAll} />
      </Card>

      <div className="space-y-5">
        {task.task === 2 && phase !== "idle" && (
          <Card className="p-5">
            <label htmlFor={`eo-notes-${task.id}`} className={`font-display font-bold mb-2 flex items-center gap-2 ${c.text}`}>
              <NotebookPen size={17} className="text-blue-600" /> {t("Brouillon")}
            </label>
            <p className={`text-xs mb-3 ${c.faint}`}>{t("Comme la feuille que le centre vous donne : notez les questions à poser.")}</p>
            <textarea
              id={`eo-notes-${task.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={7}
              spellCheck={false}
              className={`w-full p-3 rounded-xl border text-sm leading-relaxed resize-y ${c.border} ${c.card} ${c.text}`}
            />
          </Card>
        )}
        {feedback && !exam ? (
          <AiFeedback compact {...feedback} />
        ) : ended ? (
          <Card className="p-6 border-2 border-amber-500/40">
            <h3 className={`font-display font-bold mb-2 flex items-center gap-2 ${c.text}`}><MicOff size={17} className="text-amber-600" /> {t("Entretien interrompu")}</h3>
            <p className={`text-sm ${c.sub}`}>{t("Nous n'avons rien entendu à plusieurs reprises, alors l'entretien s'est arrêté. Vérifiez votre micro, puis relancez un entretien.")}</p>
          </Card>
        ) : !(task.task === 2 && phase !== "idle") && (
          <Card className="p-6">
            <h3 className={`font-display font-bold mb-3 flex items-center gap-2 ${c.text}`}><MessageCircle size={17} className="text-blue-600" /> {t("Comment ça marche")}</h3>
            <ol className={`space-y-2.5 text-sm ${c.sub} list-decimal list-inside`}>
              {(HOW_IT_WORKS[task.task] || HOW_IT_WORKS[2]).map((line) => <li key={line}>{t(line)}</li>)}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}

function DialogueBubble({ turn, who, hideText, speakingNow, onReplay }) {
  const { c, t } = useApp();
  if (turn.role === "examiner") {
    // Silent-answer re-prompts and announcements read as a softer aside.
    const aside = turn.reprompt || turn.meta;
    return (
      <div className="flex justify-start">
        <div className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md border ${aside ? "bg-amber-500/10 border-amber-500/25" : "bg-blue-600/10 border-blue-600/20"}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 flex items-center gap-1.5 ${aside ? "text-amber-600" : "text-blue-600"}`}>
            {turn.reprompt ? `${t(who)} · ${t("relance micro")}` : t(who)}
            {speakingNow && <Volume2 size={13} className="animate-pulse" />}
            {onReplay && (
              <button onClick={onReplay} aria-label={t("Réécouter la question")} className="hover:opacity-70 transition-opacity"><Volume2 size={13} /></button>
            )}
          </p>
          <p className={`text-sm leading-relaxed ${hideText ? `italic ${c.faint}` : c.text}`}>{hideText ? t("Écoutez…") : turn.text}</p>
        </div>
      </div>
    );
  }
  const muted = turn.failed || turn.emptyRec;
  const label = turn.emptyRec ? t("Rien entendu") : turn.failed ? t("Tentative non prise en compte") : t("Vous");
  return (
    <div className="flex justify-end">
      <div className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md border ${muted ? "border-amber-500/40" : c.border}`}>
        <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${muted ? "text-amber-600" : c.faint}`}>{label}</p>
        {hideText ? (
          !muted && <p className={`text-sm italic ${c.faint}`}>{t("Réponse enregistrée.")}</p>
        ) : (
          <>
            {turn.text && <p className={`text-sm leading-relaxed ${c.sub}`}>{turn.text}</p>}
            {turn.url && <audio controls src={turn.url} className="w-full mt-2 h-9" />}
          </>
        )}
      </div>
    </div>
  );
}

// Bottom control strip: one clear action (or status) per phase.
function InterviewControls({ c, t, phase, count, ended, exam, who, begin, skipReview, answer, stop, restart }) {
  return (
    <div className="mt-auto flex flex-col items-center gap-3">
      {(phase === "review" || phase === "rec") && (
        <p className={`font-mono2 font-bold text-3xl ${phase === "rec" ? "text-rose-600" : "text-blue-600"}`} role="timer">{fmt(count)}</p>
      )}
      <p className={`text-sm font-semibold ${c.sub}`}>
        {phase === "idle" && t("Prêt·e quand vous l'êtes.")}
        {phase === "opening" && (<span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin text-blue-600" /> {t("L'examinateur prend la parole…")}</span>)}
        {phase === "review" && t("Préparez-vous… à la fin du temps, c'est à vous de commencer la conversation.")}
        {phase === "rec" && (<span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 rec-dot" /> {t("À vous — enregistrement en cours")}</span>)}
        {phase === "processing" && (<span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin text-blue-600" /> {t(`${who} vous écoute…`)}</span>)}
        {phase === "speaking" && (<span className="inline-flex items-center gap-2 text-blue-600"><Volume2 size={14} className="animate-pulse" /> {t(`${who} parle…`)}</span>)}
        {phase === "ready" && t("À vous de répondre.")}
        {phase === "done" && (ended ? t("Entretien interrompu, faute de réponse audible.") : exam ? t("Partie terminée.") : t("Entretien terminé — consultez votre évaluation."))}
      </p>

      {phase === "idle" && (
        <button onClick={begin} className="px-6 py-3.5 rounded-full grad-brand text-white font-semibold flex items-center gap-2 shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform">
          <Mic size={18} /> {t("Commencer l'entretien")}
        </button>
      )}
      {phase === "review" && !exam && (
        <button onClick={skipReview} aria-label={t("Passer la préparation et parler maintenant")} className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-blue-600 text-blue-600 shadow-xl transition-transform hover:scale-105 ${c.card}`}>
          <ChevronRight size={26} />
        </button>
      )}
      {phase === "rec" && (
        <button onClick={stop} aria-label={t("J'ai fini de parler")} className="w-16 h-16 rounded-full flex items-center justify-center bg-rose-600 text-white shadow-xl shadow-rose-600/30 transition-transform hover:scale-105">
          <Square size={22} />
        </button>
      )}
      {phase === "rec" && <p className={`text-xs ${c.faint}`}>{t("Appuyez quand vous avez fini de parler.")}</p>}
      {(phase === "opening" || phase === "processing" || phase === "speaking") && (
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${c.border} ${c.faint}`}>
          {phase === "speaking" ? <Volume2 size={24} className="animate-pulse text-blue-600" /> : <Loader2 size={24} className="animate-spin" />}
        </div>
      )}
      {phase === "ready" && (
        <button onClick={answer} aria-label={t("Répondre")} className="w-16 h-16 rounded-full grad-brand text-white flex items-center justify-center shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform">
          <Mic size={24} />
        </button>
      )}
      {phase === "done" && restart && (
        <button onClick={restart} className={`px-5 py-2.5 rounded-full border font-semibold text-sm flex items-center gap-2 ${c.card} ${c.border} ${c.sub} ${c.hoverSoft}`}>
          <RotateCcw size={15} /> {t("Refaire un entretien")}
        </button>
      )}
    </div>
  );
}
