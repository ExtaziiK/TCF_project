import { useEffect, useRef } from "react";
import { Sparkles, Mic, Square, ChevronRight, Loader2, AlertCircle, Volume2, RotateCcw, MessageCircle, MicOff } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";
import { AiFeedback } from "@/components/expression/AiFeedback";
import { useOralInterview, MAX_FOLLOW_UPS } from "@/hooks/useOralInterview";
import { fmt } from "@/utils/format";

// The oral-exam interview simulation for one task: the subject with review
// time, then a recorded dialogue with the AI examiner — the user answers,
// the examiner's follow-up arrives as text and voice, three times, and the
// whole conversation is graded at the end.
export function OralInterview({ task }) {
  const { c, notify, t } = useApp();
  const { phase, count, turns, feedback, ended, error, followUpsAsked, reviewSecs, begin, skipReview, answer, stop, replay, restart } = useOralInterview(task, notify);
  const endRef = useRef(null);

  // Keep the latest exchange in view as the dialogue grows.
  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, phase]);

  return (
    <div className="grid lg:grid-cols-3 gap-5 rise">
      <Card className="lg:col-span-2 p-6 flex flex-col">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex gap-2 flex-wrap">
            <Pill tone="blue">{t("Lecture du sujet :")} {fmt(reviewSecs)}</Pill>
            <Pill tone="red">{t("Parole :")} {fmt(task.dur)}</Pill>
          </div>
          <Pill tone="slate">{t("Relances :")} {Math.min(followUpsAsked, MAX_FOLLOW_UPS)}/{MAX_FOLLOW_UPS}</Pill>
        </div>

        <div className={`p-4 rounded-2xl border-2 border-blue-600/30 mb-5 ${phase === "review" ? "ring-2 ring-blue-600/20" : ""}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wide text-blue-600 mb-1.5`}>{t("Sujet")}</p>
          <p className={`leading-relaxed font-medium ${c.text}`}>{task.prompt}</p>
        </div>

        {turns.length > 0 && (
          <div className="space-y-3 mb-5 max-h-[26rem] overflow-y-auto pr-1">
            {turns.map((tn, i) => (
              <DialogueBubble
                key={tn.id}
                turn={tn}
                speakingNow={phase === "speaking" && i === turns.length - 1}
                onReplay={(phase === "ready" || phase === "done") && tn.role === "examiner" ? () => replay(tn) : null}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}

        {error && (
          <p className="mb-4 text-sm font-semibold text-rose-600 flex items-start gap-1.5">
            <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <InterviewControls c={c} t={t} phase={phase} count={count} ended={ended} begin={begin} skipReview={skipReview} answer={answer} stop={stop} restart={restart} />

        <p className={`mt-5 text-xs ${c.faint} flex items-center justify-center gap-1.5 text-center`}>
          <Sparkles size={13} className="text-blue-600" /> {t("Entretien simulé par l'IA : transcription Whisper, relances et évaluation générées, voix de l'examinateur par IA.")}
        </p>
      </Card>

      <div className="space-y-5">
        {feedback ? (
          <AiFeedback compact {...feedback} />
        ) : ended ? (
          <Card className="p-6 border-2 border-amber-500/40">
            <h3 className={`font-display font-bold mb-2 flex items-center gap-2 ${c.text}`}><MicOff size={17} className="text-amber-600" /> {t("Entretien interrompu")}</h3>
            <p className={`text-sm ${c.sub}`}>{t("Nous n'avons rien entendu à plusieurs reprises, alors l'entretien s'est arrêté. Vérifiez votre micro, puis relancez un entretien.")}</p>
          </Card>
        ) : (
          <Card className="p-6">
            <h3 className={`font-display font-bold mb-3 flex items-center gap-2 ${c.text}`}><MessageCircle size={17} className="text-blue-600" /> {t("Comment ça marche")}</h3>
            <ol className={`space-y-2.5 text-sm ${c.sub} list-decimal list-inside`}>
              <li>{t("Prenez connaissance du sujet pendant le temps de lecture.")}</li>
              <li>{t("Répondez à voix haute — votre réponse est transcrite.")}</li>
              <li>{t("L'examinateur IA vous relance 3 fois, à l'écrit et à l'oral.")}</li>
              <li>{t("À la fin, l'IA évalue l'ensemble de l'entretien.")}</li>
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}

function DialogueBubble({ turn, speakingNow, onReplay }) {
  const { c, t } = useApp();
  if (turn.role === "examiner") {
    // Silent-answer re-prompts read as a softer aside, not a graded question.
    const isReprompt = turn.reprompt;
    return (
      <div className="flex justify-start">
        <div className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md border ${isReprompt ? "bg-amber-500/10 border-amber-500/25" : "bg-blue-600/10 border-blue-600/20"}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 flex items-center gap-1.5 ${isReprompt ? "text-amber-600" : "text-blue-600"}`}>
            {isReprompt ? t("Examinateur · relance micro") : t("Examinateur")}
            {speakingNow && <Volume2 size={13} className="animate-pulse" />}
            {onReplay && (
              <button onClick={onReplay} aria-label={t("Réécouter la question")} className="hover:opacity-70 transition-opacity"><Volume2 size={13} /></button>
            )}
          </p>
          <p className={`text-sm leading-relaxed ${c.text}`}>{turn.text}</p>
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
        {turn.text && <p className={`text-sm leading-relaxed ${c.sub}`}>{turn.text}</p>}
        {turn.url && <audio controls src={turn.url} className="w-full mt-2 h-9" />}
      </div>
    </div>
  );
}

// Bottom control strip: one clear action (or status) per phase.
function InterviewControls({ c, t, phase, count, ended, begin, skipReview, answer, stop, restart }) {
  return (
    <div className="mt-auto flex flex-col items-center gap-3">
      {(phase === "review" || phase === "rec") && (
        <p className={`font-mono2 font-bold text-3xl ${phase === "rec" ? "text-rose-600" : "text-blue-600"}`} role="timer">{fmt(count)}</p>
      )}
      <p className={`text-sm font-semibold ${c.sub}`}>
        {phase === "idle" && t("Prêt·e quand vous l'êtes.")}
        {phase === "review" && t("Lisez le sujet et préparez vos idées… l'enregistrement démarrera automatiquement.")}
        {phase === "rec" && (<span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 rec-dot" /> {t("Enregistrement en cours")}</span>)}
        {phase === "processing" && (<span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin text-blue-600" /> {t("L'examinateur vous écoute…")}</span>)}
        {phase === "speaking" && (<span className="inline-flex items-center gap-2 text-blue-600"><Volume2 size={14} className="animate-pulse" /> {t("L'examinateur parle…")}</span>)}
        {phase === "ready" && t("À vous de répondre.")}
        {phase === "done" && (ended ? t("Entretien interrompu, faute de réponse audible.") : t("Entretien terminé — consultez votre évaluation."))}
      </p>

      {phase === "idle" && (
        <button onClick={begin} className="px-6 py-3.5 rounded-full grad-brand text-white font-semibold flex items-center gap-2 shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform">
          <Mic size={18} /> {t("Commencer l'entretien")}
        </button>
      )}
      {phase === "review" && (
        <button onClick={skipReview} aria-label={t("Passer la lecture et parler maintenant")} className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-blue-600 text-blue-600 shadow-xl transition-transform hover:scale-105">
          <ChevronRight size={26} />
        </button>
      )}
      {phase === "rec" && (
        <button onClick={stop} aria-label={t("Arrêter")} className="w-16 h-16 rounded-full flex items-center justify-center bg-rose-600 text-white shadow-xl shadow-rose-600/30 transition-transform hover:scale-105">
          <Square size={22} />
        </button>
      )}
      {(phase === "processing" || phase === "speaking") && (
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${c.border} ${c.faint}`}>
          {phase === "processing" ? <Loader2 size={24} className="animate-spin" /> : <Volume2 size={24} className="animate-pulse text-blue-600" />}
        </div>
      )}
      {phase === "ready" && (
        <button onClick={answer} aria-label={t("Répondre")} className="w-16 h-16 rounded-full grad-brand text-white flex items-center justify-center shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform">
          <Mic size={24} />
        </button>
      )}
      {phase === "done" && (
        <button onClick={restart} className={`px-5 py-2.5 rounded-full border font-semibold text-sm flex items-center gap-2 ${c.border} ${c.sub} ${c.hoverSoft}`}>
          <RotateCcw size={15} /> {t("Refaire un entretien")}
        </button>
      )}
    </div>
  );
}
