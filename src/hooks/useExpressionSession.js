import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { generateExpressionSession } from "@/services/expressionSessionService";

// Loads one locked practice session (one prompt per tâche) for an
// expression section. The set is generated once per mount — switching tabs
// never reshuffles; a fresh visit yields a fresh selection.
export function useExpressionSession(section) {
  const { user } = useApp();
  const [tasks, setTasks] = useState(null); // null = loading
  useEffect(() => {
    let live = true;
    generateExpressionSession(user?.id, section).then((t) => { if (live) setTasks(t); });
    return () => { live = false; };
  }, [user?.id, section]);
  return { loading: tasks === null, tasks: tasks || [] };
}
