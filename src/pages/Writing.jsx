import { useState } from "react";
import { Play, Sparkles, GraduationCap, ChevronDown, Check, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, TimerChip } from "@/components/common";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { getBank } from "@/services/bankService";
import { useWritingTask } from "@/hooks/useWritingTask";
import { useExpressionSession } from "@/hooks/useExpressionSession";
import { WorkshopSkeleton, EmptyTask } from "@/components/expression/WorkshopStates";
import { AiFeedback } from "@/components/expression/AiFeedback";
import { OFFICIAL_TASKS } from "@/services/expressionSessionService";

// Premium module backed by the question bank (section "ee") once quizzes
// exist there; until then the interactive writing workshop below is shown.
export function Writing() {
  if (getBank().ee.some((q) => q.kind !== "prompt")) {
    return (
      <BankExplorer
        back
        sections={["ee"]}
        eyebrow="Expression écrite"
        title="Écrivez comme le jour de l'examen"
        sub="Tous les quiz officiels d'expression écrite, en conditions d'examen."
      />
    );
  }
  return <WritingWorkshop />;
}

function WritingWorkshop() {
  const { t } = useApp();
  return (
    <PageShell back eyebrow={t("Expression écrite")} title={t("Écrivez, comptez vos mots, comparez")} sub={t("Trois tâches, comme le jour de l'examen. L'analyse instantanée est assistée par IA ; les abonnés annuels reçoivent aussi une correction humaine.")}>
      <WritingWorkshopBody />
    </PageShell>
  );
}

// Shell-less body so the mock-exam runner can embed the exact same
// experience as the Expression écrite page. The session serves exactly one
// prompt per official tâche, drawn from the Question Bank (admin content)
// via a rotation-aware random pick — see expressionSessionService.
export function WritingWorkshopBody() {
  const { c, t } = useApp();
  const { loading, tasks } = useExpressionSession("ee");
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
      {task?.empty ? <EmptyTask task={task.task} /> : <WritingTaskPane key={task.id} task={task} />}
    </div>
  );
}

function WritingTaskPane({ task }) {
  const { c, notify, t } = useApp();
  const { text, onTextChange, left, running, setRunning, showSample, setShowSample, ai, analyze, analyzing, words, lo, hi } = useWritingTask(task, notify);

  return (
    <div className="grid lg:grid-cols-3 gap-5 rise">
      <div className="lg:col-span-2 space-y-5">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <Pill tone="red">{t(task.words)}</Pill>
            <div className="flex items-center gap-2">
              <TimerChip left={left} total={task.min * 60} />
              {!running && left > 0 && <Btn small variant="ghost" icon={Play} onClick={() => setRunning(true)}>{t("Lancer le chrono")}</Btn>}
            </div>
          </div>
          <p className={`font-medium leading-relaxed ${c.text}`}>{task.prompt}</p>
        </Card>
        <Card className="p-2">
          <div className={`flex items-center gap-1 px-3 py-2 border-b ${c.border}`} aria-hidden="true">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${c.sub} ${c.hoverSoft}`}>G</span>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm italic ${c.sub} ${c.hoverSoft}`}>I</span>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm underline ${c.sub} ${c.hoverSoft}`}>S</span>
            <span className={`ml-auto pr-2 text-xs font-mono2 font-semibold ${words >= lo && words <= hi ? "text-emerald-500" : words > 0 ? "text-amber-500" : c.faint}`}>{words} {t(words > 1 ? "mots" : "mot")} · {t("cible")} {lo}–{hi}</span>
          </div>
          <textarea value={text} onChange={(e) => onTextChange(e.target.value)} rows={11} placeholder={t("Commencez à écrire ici — le chronomètre démarre automatiquement…")} aria-label={t("Zone de rédaction")} className={`w-full p-5 bg-transparent outline-none text-[15px] leading-relaxed resize-y ${c.text} placeholder:opacity-40`} />
        </Card>
        <div className="flex gap-3 flex-wrap">
          <Btn icon={Sparkles} variant="accent" onClick={analyze} disabled={analyzing}>{t(analyzing ? "Analyse en cours…" : "Analyser avec l'IA")}</Btn>
          <Btn variant="ghost" icon={GraduationCap} onClick={() => notify(t("Texte envoyé pour correction humaine (fonctionnalité Premium Annuel — démo)."))}>{t("Envoyer à un enseignant")}</Btn>
        </div>
        {analyzing && !ai && (
          <Card className="p-6 border-2 border-blue-600/40 flex items-center gap-3">
            <Loader2 size={18} className="text-blue-600 animate-spin shrink-0" />
            <p className={`text-sm ${c.sub}`}>{t("L'examinateur IA lit votre texte…")}</p>
          </Card>
        )}
        {ai && <AiFeedback level={ai.level} summary={ai.summary} strengths={ai.strengths} improvements={ai.improvements} corrected={ai.corrected} />}
      </div>
      <div className="space-y-5">
        <Card className="p-6">
          <button onClick={() => setShowSample(!showSample)} className="w-full flex items-center justify-between" aria-expanded={showSample}>
            <span className={`font-display font-bold ${c.text}`}>{t("Exemple de réponse")}</span>
            <ChevronDown size={18} className={`text-blue-600 transition-transform ${showSample ? "rotate-180" : ""}`} />
          </button>
          {showSample ? (
            task.sample
              ? <p className={`mt-4 text-sm leading-relaxed ${c.sub} rise`}>{task.sample}</p>
              : <p className={`mt-3 text-sm ${c.faint}`}>{t("Pas encore d'exemple pour ce sujet.")}</p>
          ) : (
            <p className={`mt-3 text-sm ${c.faint}`}>{t("Rédigez d'abord votre texte, puis comparez-le à une réponse de niveau B2/C1.")}</p>
          )}
        </Card>
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-3 ${c.text}`}>{t("Conseils pour cette tâche")}</h3>
          <ul className={`space-y-2.5 text-sm ${c.sub}`}>
            <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{t("Répondez à chaque élément de la consigne, sans exception.")}</li>
            <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{t("Gardez 3 minutes pour vous relire : accords, négations, accents.")}</li>
            <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{t("Le hors-sujet est plus pénalisé qu'une petite faute de grammaire.")}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
