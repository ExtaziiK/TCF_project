import { useState } from "react";
import { Sparkles, Mic, Square, ChevronRight, Play, Pause } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { getBank } from "@/services/bankService";
import { useSpeakingSession } from "@/hooks/useSpeakingSession";
import { useExpressionSession } from "@/hooks/useExpressionSession";
import { WorkshopSkeleton, EmptyTask } from "@/components/expression/WorkshopStates";
import { OFFICIAL_TASKS } from "@/services/expressionSessionService";
import { fmt } from "@/utils/format";

// Premium module backed by the question bank (section "eo") once quizzes
// exist there; until then the interactive speaking studio below is shown.
export function Speaking() {
  if (getBank().eo.some((q) => q.kind !== "prompt")) {
    return (
      <BankExplorer
        back
        sections={["eo"]}
        eyebrow="Expression orale"
        title="Parlez comme le jour de l'examen"
        sub="Tous les quiz officiels d'expression orale, en conditions d'examen."
      />
    );
  }
  return <SpeakingStudio />;
}

function SpeakingStudio() {
  const { t } = useApp();
  return (
    <PageShell back eyebrow={t("Expression orale")} title={t("Parlez, réécoutez-vous, progressez")} sub={t("Le micro est simulé dans cette démo. En production, votre enregistrement serait analysé pour la prononciation, le débit et la richesse lexicale.")}>
      <SpeakingStudioBody />
    </PageShell>
  );
}

// Shell-less body so the mock-exam runner can embed the exact same
// experience as the Expression orale page. The session serves exactly one
// prompt per official tâche, drawn from the Question Bank (admin content)
// via a rotation-aware random pick — see expressionSessionService.
export function SpeakingStudioBody() {
  const { c, t } = useApp();
  const { loading, tasks } = useExpressionSession("eo");
  const [active, setActive] = useState(OFFICIAL_TASKS[0]);

  if (loading) return <WorkshopSkeleton />;
  const task = tasks.find((t) => t.task === active) || tasks[0];

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-6">
        {tasks.map((tk) => (
          <button key={tk.task} onClick={() => setActive(tk.task)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${active === tk.task ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            {t(tk.empty ? `Tâche ${tk.task}` : tk.t)}
          </button>
        ))}
      </div>
      {task?.empty ? <EmptyTask task={task.task} /> : <SpeakingTaskPane key={task.id} task={task} />}
    </div>
  );
}

function SpeakingTaskPane({ task }) {
  const { c, notify, t } = useApp();
  const { phase, count, history, playingId, setPlayingId, start, stop, skipPrep } = useSpeakingSession(task, notify);

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
            {phase === "idle" ? fmt(task.dur) : fmt(count)}
          </p>
          <p className={`text-sm font-semibold ${c.sub}`}>
            {phase === "idle" && t("Prêt·e quand vous l'êtes.")}
            {phase === "prep" && t("Préparez vos idées… l'enregistrement démarrera automatiquement.")}
            {phase === "rec" && (<span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 rec-dot" /> {t("Enregistrement en cours")}</span>)}
          </p>
          {phase === "idle" ? (
            <button onClick={start} aria-label={t("Démarrer l'enregistrement")} className="w-20 h-20 rounded-full grad-brand text-white flex items-center justify-center shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform"><Mic size={30} /></button>
          ) : (
            <button onClick={phase === "rec" ? stop : skipPrep} aria-label={phase === "rec" ? t("Arrêter") : t("Passer la préparation")} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105 ${phase === "rec" ? "bg-rose-600 text-white shadow-rose-600/30" : "border-2 border-blue-600 text-blue-600"}`}>
              {phase === "rec" ? <Square size={26} /> : <ChevronRight size={30} />}
            </button>
          )}
        </div>
        <p className={`text-xs ${c.faint} flex items-center justify-center gap-1.5`}><Sparkles size={13} className="text-blue-600" /> {t("Analyse IA de la prononciation — bientôt disponible")}</p>
      </Card>
      <Card className="p-6">
        <h3 className={`font-display font-bold mb-4 ${c.text}`}>{t("Vos enregistrements")}</h3>
        {history.length === 0 && <p className={`text-sm py-4 text-center ${c.faint}`}>{t("Aucun enregistrement pour l'instant. Lancez le micro pour commencer.")}</p>}
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border ${c.border}`}>
              <button onClick={() => setPlayingId(playingId === h.id ? null : h.id)} aria-label={t("Réécouter")} className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 hover:bg-blue-600/20">
                {playingId === h.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${c.text}`}>{t(h.t)}</p>
                <p className={`text-xs font-mono2 ${c.faint}`}>{h.dur} · {t(h.when)}</p>
                {playingId === h.id && <div className={`mt-2 h-1.5 rounded-full ${c.track} overflow-hidden`}><div className="h-full w-1/3 grad-brand rounded-full" /></div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
