import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { hasAcceptedCurrentTerms } from "@/services/termsService";
import { TERMS_REACCEPTANCE } from "@/constants/terms";

// Decides whether a signed-in account must accept the current conditions before
// it can use the app again — the path by which a version bump reaches accounts
// that already exist, including those created before consent was recorded.
//
// Fails open on purpose: hasAcceptedCurrentTerms() returns null when it cannot
// answer (migration not applied, network down), and an unanswered question must
// never lock people out of the product. The gate also stays out of the way
// during onboarding, which collects the same consent itself.
export function useTermsGate() {
  const { user, authReady, pendingOnboarding } = useApp();
  const [blocked, setBlocked] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (!TERMS_REACCEPTANCE || !authReady || !userId || pendingOnboarding) {
      setBlocked(false);
      return undefined;
    }
    let cancelled = false;
    hasAcceptedCurrentTerms(userId).then((ok) => { if (!cancelled) setBlocked(ok === false); });
    return () => { cancelled = true; };
  }, [userId, authReady, pendingOnboarding]);

  return { blocked, clear: () => setBlocked(false) };
}
