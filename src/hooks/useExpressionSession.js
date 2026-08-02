import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { generateExpressionSession } from "@/services/expressionSessionService";
import { deriveRole, ROLES } from "@/auth/rbac";

// Loads one locked practice session (one prompt per tâche) for an
// expression section. The set is generated once per mount — switching tabs
// never reshuffles; a fresh visit yields a fresh selection.
//
// A free account is the exception: it always gets the same fixed subject, so
// its two AI analyses per tâche are spent on one subject rather than scattered
// across a rotation it cannot finish.
export function useExpressionSession(section) {
  const { user } = useApp();
  const isFreeTier = deriveRole(user) === ROLES.FREE_USER;
  const [tasks, setTasks] = useState(null); // null = loading
  useEffect(() => {
    let live = true;
    generateExpressionSession(user?.id, section, { free: isFreeTier }).then((t) => { if (live) setTasks(t); });
    return () => { live = false; };
  }, [user?.id, section, isFreeTier]);
  return { loading: tasks === null, tasks: tasks || [], isFreeTier };
}
