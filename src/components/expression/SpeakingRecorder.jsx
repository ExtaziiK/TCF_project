import { Sparkles, Mic, Square, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";
import { AiFeedback } from "@/components/expression/AiFeedback";
import { useSpeakingSession } from "@/hooks/useSpeakingSession";
import { fmt } from "@/utils/format";

// The one-shot speaking workshop for a task: record an answer against the
// clock, then Whisper transcribes it and the AI grades the transcript.
// Tasks 1 and 3 use this; task 2 runs as a live interview (OralInterview).
export function SpeakingRecorder({ task }) {
  const { c, notify, t } = useApp();
  const { phase, count, history, start, stop, skipPrep } = useSpeakingSession(task, notify);

  return (
    <div className="grid lg:grid-cols-3 gap-5 rise">
      <Card className="lg:col-span-2 p-7 text-center">
        <div className="flex justify-center gap-2 mb-5 flex-wrap">
          <Pill tone="blue">{task.prep ? `${t("Préparation :")} ${fmt(task.prep)}` : t("Sans préparation")}</Pill>
          <Pill tone="red">{t("Parole :")} {fmt(task.dur)}</Pill>
        </div>
        <p className={`max-w-lg mx-auto leading-relaxed font-medium ${c.text}`}>{task.prompt}</p>
        <div className="my-9 flex flex-col items-center gap-5">
          {phase === "rec" && (
            <div className="flex items-end gap-1.5 h-12" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((b) => (
                <span key={b} className="w-2 rounded-full grad-brand eqbar" style={{ height: "100%", animationDelay: `${b * 0.12}s` }} />
              ))}
            </div>
          )}
          <p className={`font-mono2 font-bold text-4xl ${phase === "rec" ? "text-rose-600" : phase === "prep" ? "text-blue-600" : c.faint}`} role="timer">
            {phase === "idle" || phase === "processing" ? fmt(task.dur) : fmt(count)}
          </p>
          <p className={`text-sm font-semibold ${c.sub}`}>
            {phase === "idle" && t("Prêt·e quand vous l'êtes.")}
            {phase === "prep" && t("Préparez vos idées… l'enregistrement démarrera automatiquement.")}
            {phase === "rec" && (<span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 rec-dot" /> {t("Enregistrement en cours")}</span>)}
            {phase === "processing" && (<span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin text-blue-600" /> {t("Transcription et analyse en cours…")}</span>)}
          </p>
          {phase === "idle" ? (
            <button onClick={start} aria-label={t("Démarrer l'enregistrement")} className="w-20 h-20 rounded-full grad-brand text-white flex items-center justify-center shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform"><Mic size={30} /></button>
          ) : phase === "processing" ? (
            <button disabled aria-label={t("Analyse en cours")} className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${c.border} ${c.faint}`}><Loader2 size={28} className="animate-spin" /></button>
          ) : (
            <button onClick={phase === "rec" ? stop : skipPrep} aria-label={phase === "rec" ? t("Arrêter") : t("Passer la préparation")} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105 ${phase === "rec" ? "bg-rose-600 text-white shadow-rose-600/30" : "border-2 border-blue-600 text-blue-600"}`}>
              {phase === "rec" ? <Square size={26} /> : <ChevronRight size={30} />}
            </button>
          )}
        </div>
        <p className={`text-xs ${c.faint} flex items-center justify-center gap-1.5`}><Sparkles size={13} className="text-blue-600" /> {t("Transcription et analyse IA de votre réponse, propulsées par Whisper.")}</p>
      </Card>
      <Card className="p-6">
        <h3 className={`font-display font-bold mb-4 ${c.text}`}>{t("Vos enregistrements")}</h3>
        {history.length === 0 && <p className={`text-sm py-4 text-center ${c.faint}`}>{t("Aucun enregistrement pour l'instant. Lancez le micro pour commencer.")}</p>}
        <div className="space-y-4">
          {history.map((h) => (
            <div key={h.id} className={`p-3.5 rounded-2xl border ${c.border}`}>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-medium truncate ${c.text}`}>{t(h.t)}</p>
                <span className={`text-xs font-mono2 shrink-0 ${c.faint}`}>{h.dur} · {t(h.when)}</span>
              </div>
              {h.url && <audio controls src={h.url} className="w-full mt-2.5" />}
              {h.status === "processing" && (
                <p className="mt-2.5 text-xs font-semibold text-blue-600 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> {t("Transcription et analyse en cours…")}</p>
              )}
              {h.status === "error" && (
                <p className="mt-2.5 text-xs font-semibold text-rose-600 flex items-start gap-1.5"><AlertCircle size={13} className="shrink-0 mt-0.5" /> {h.error}</p>
              )}
              {h.status === "done" && h.empty && (
                <p className="mt-2.5 text-xs font-semibold text-amber-600 flex items-start gap-1.5"><AlertCircle size={13} className="shrink-0 mt-0.5" /> {t("Aucune parole détectée dans l'enregistrement.")}</p>
              )}
              {h.status === "done" && h.transcript && (
                <div className="mt-3">
                  <p className={`text-[11px] font-bold uppercase tracking-wide ${c.faint} mb-1`}>{t("Transcription")}</p>
                  <p className={`text-sm leading-relaxed ${c.sub}`}>{h.transcript}</p>
                </div>
              )}
              {h.status === "done" && h.feedback && <div className="mt-3"><AiFeedback compact {...h.feedback} /></div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
