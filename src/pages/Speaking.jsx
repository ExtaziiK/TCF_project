import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { PageShell } from "@/components/common";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { getBank } from "@/services/bankService";
import { useExpressionSession } from "@/hooks/useExpressionSession";
import { WorkshopSkeleton, EmptyTask } from "@/components/expression/WorkshopStates";
import { OralInterview } from "@/components/expression/OralInterview";
import { OFFICIAL_TASKS } from "@/services/expressionSessionService";

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
    <PageShell back eyebrow={t("Expression orale")} title={t("Passez l'entretien avec l'examinateur IA")} sub={t("Découvrez le sujet, répondez à voix haute : l'examinateur IA vous relance trois fois — à l'écrit et à l'oral — puis évalue tout l'entretien.")}>
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
      {task?.empty ? <EmptyTask task={task.task} /> : <OralInterview key={task.id} task={task} />}
    </div>
  );
}
