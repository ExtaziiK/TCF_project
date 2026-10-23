import { useApp } from "@/context/AppContext";
import { PageShell } from "@/components/common";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { useBankSummary } from "@/hooks/useBank";
import { useExpressionSession } from "@/hooks/useExpressionSession";
import { WorkshopSkeleton, EmptyTask } from "@/components/expression/WorkshopStates";
import { OralInterview } from "@/components/expression/OralInterview";
import { OralExamSequence } from "@/components/expression/OralExamSequence";
import { FreeExpressionNotice } from "@/components/expression/FreeExpressionNotice";
import { OFFICIAL_TASKS } from "@/services/expressionSessionService";
import { useExpressionTask } from "@/context/ExpressionTaskContext";

// Every tâche runs as a live interview, as on exam day: the AI examiner asks
// the Tâche 1 questions, plays the Tâche 2 interlocutor, challenges the
// Tâche 3 point of view, and grades the whole exchange at the end.

// Premium module backed by the question bank (section "eo") once quizzes
// exist there; until then the interactive speaking studio below is shown.
export function Speaking() {
  const bank = useBankSummary();
  if (bank.eo.some((q) => q.kind !== "prompt")) {
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
    <PageShell back eyebrow={t("Expression orale")} title={t("Parlez comme le jour de l'examen")} sub={t("Un entretien avec l'examinateur IA, chronométré comme le jour J : il vous pose les questions, joue l'interlocuteur de la tâche 2, vous contredit en tâche 3, puis évalue tout l'échange.")}>
      <SpeakingStudioBody />
    </PageShell>
  );
}

// Shell-less body so the mock-exam runner can embed the same experience as
// the Expression orale page. The session serves exactly one prompt per
// official tâche, drawn from the Question Bank (admin content) via a
// rotation-aware random pick — see expressionSessionService. In the TCF blanc
// (`inExam`) the three tâches run back to back as one 12-minute épreuve.
export function SpeakingStudioBody({ inExam = false } = {}) {
  const { c, t } = useApp();
  const { loading, tasks, isFreeTier } = useExpressionSession("eo");
  // Shared with the guide side panel when both are on screen (Exams hub); local
  // state otherwise (standalone page / mock runner).
  const [active, setActive] = useExpressionTask(OFFICIAL_TASKS[0]);

  if (loading) return <WorkshopSkeleton />;
  if (inExam) return <OralExamSequence tasks={tasks} />;
  const task = tasks.find((t) => t.task === active) || tasks[0];

  return (
    <div>
      {isFreeTier && <FreeExpressionNotice section="eo" />}
      <div className="flex gap-2 flex-wrap mb-6">
        {tasks.map((tk) => (
          <button key={tk.task} onClick={() => setActive(tk.task)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${active === tk.task ? "bg-[var(--tool-fill,#2563EB)] text-white shadow-md shadow-black/10" : `border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
            {t(tk.empty ? `Tâche ${tk.task}` : tk.t)}
          </button>
        ))}
      </div>
      {task?.empty ? (
        <EmptyTask task={task.task} />
      ) : (
        <OralInterview key={task.id} task={task} />
      )}
    </div>
  );
}
