import { createContext, useContext, useState } from "react";

// Shares the selected expression tâche (1/2/3) between the EE/EO workshop and
// its "Guide de l'épreuve" side panel, so picking a task on one side updates
// the other — the guide always shows the method for the task being practised.
// Both surfaces key off the official task NUMBER (see OFFICIAL_TASKS and each
// guide task's `.n`), never a list index, so the two stay aligned.
const ExpressionTaskContext = createContext(null);

export function ExpressionTaskProvider({ children, initial = 1 }) {
  const [active, setActive] = useState(initial);
  return <ExpressionTaskContext.Provider value={{ active, setActive }}>{children}</ExpressionTaskContext.Provider>;
}

// Returns [active, setActive] backed by the shared context when one is present
// (workshop + guide rendered together), or by component-local state otherwise
// (the standalone guide pages and the mock-exam runner), so those keep working
// unchanged with no provider in the tree.
export function useExpressionTask(initial = 1) {
  const ctx = useContext(ExpressionTaskContext);
  const local = useState(initial);
  return ctx ? [ctx.active, ctx.setActive] : local;
}
