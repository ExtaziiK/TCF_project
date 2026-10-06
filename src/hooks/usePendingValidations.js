import { useEffect, useState } from "react";
import { countPendingValidations } from "@/services/adminService";

// The number of DZD payment requests waiting for approval, for the badge on
// the validateur's nav button. Only runs for the validateur — staff already
// have the "Demandes" badge inside Administration. Polled on the app's usual
// rhythm, skipped while the tab is hidden, and refreshed on focus and whenever
// the Validation page approves something (PENDING_VALIDATIONS_EVENT).
export const PENDING_VALIDATIONS_EVENT = "tcf:validations-changed";

export function usePendingValidations(enabled) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) { setCount(0); return; }
    let cancelled = false;
    const check = async () => {
      if (document.hidden) return;
      const r = await countPendingValidations();
      if (!cancelled && r.ok) setCount(r.data.count || 0);
    };
    check();
    const interval = setInterval(check, 60000);
    window.addEventListener("focus", check);
    window.addEventListener(PENDING_VALIDATIONS_EVENT, check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", check);
      window.removeEventListener(PENDING_VALIDATIONS_EVENT, check);
    };
  }, [enabled]);
  return count;
}
