import { useEffect } from "react";
import { supabase } from "@/services/supabaseClient";
import { refreshSession, mapSupabaseUser } from "@/services/authService";

// Keeps the browser's idea of the plan in step with the account's.
//
// The plan lives in app_metadata, which is sealed into the access token at
// login. Anything that changes it server-side — an admin extending access,
// granting or revoking a pass — is invisible here until the token is reminted,
// which otherwise means up to an hour, or a sign-out. An admin who adds 90 days
// sees the new date immediately in the panel while the customer's own page
// still shows the old one, and concludes nothing happened.
//
// getUser() asks the Auth server rather than reading the cached token, so it
// returns what the account ACTUALLY holds. Comparing the two is what makes a
// change detectable at all.
//
// Silent on purpose: useDzActivation already announces a payment being
// approved, and a second toast for the same event would be noise. This is the
// safety net under every other path.
const EVERY_MS = 5 * 60 * 1000;

// The fields worth reminting a token for. plan_label matters on its own: it
// drives the AI quotas, so a tier change with the same end date still has to
// reach the client.
// mapSupabaseUser flattens app_metadata, so the two sides are compared through
// one formatter rather than by matching field names twice.
const signature = (plan, label, until) => `${plan || ""}|${label || ""}|${until || ""}`;

export function usePlanSync({ user, setUser }) {
  const userId = user?.id;
  const current = signature(user?.plan, user?.planLabel, user?.premiumUntil);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const check = async () => {
      if (document.hidden || cancelled) return;
      const { data, error } = await supabase.auth.getUser();
      if (error || cancelled) return;
      const m = data?.user?.app_metadata || {};
      const live = signature(m.plan, m.plan_label, m.premium_until);
      if (live === current) return;

      const { session } = await refreshSession();
      const mapped = mapSupabaseUser(session);
      if (!cancelled && mapped) setUser(mapped);
    };

    // Not on mount: the session was just resolved and re-asking immediately
    // would only duplicate that work. On focus, because returning to the tab is
    // exactly when someone checks whether their access changed.
    const interval = setInterval(check, EVERY_MS);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [userId, current, setUser]);
}
