import { useEffect } from "react";
import { latestApprovedRequest } from "@/services/subscriptionService";
import { refreshSession, mapSupabaseUser } from "@/services/authService";

// A Stripe buyer comes back through a success URL, so the app can grant and
// remint the token on the spot. A DZD buyer does not: an admin approves the
// receipt minutes or days later, with nothing to notify the browser. The plan
// lives in app_metadata, sealed into the access token, so the app goes on
// saying "Sans papier" through any number of reloads until that token expires
// on its own — up to an hour of a paying customer being told they have not paid.
//
// So the client watches its own request instead. RLS already lets a buyer read
// their own row, and the check only runs for accounts that are NOT Premium, so
// a paying user never makes it.
const SEEN_KEY = "tcf_dz_activated";

// Remembers which approved request has already been acted on. Without it an old
// approval whose pass has since EXPIRED would send the app into refreshing the
// token on every tick, forever, and never reach Premium.
const seen = () => {
  try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; }
};
const remember = (id) => {
  try { localStorage.setItem(SEEN_KEY, id); } catch { /* storage unavailable */ }
};

export function useDzActivation({ user, setUser, notify }) {
  const userId = user?.id;
  const isPremium = user?.plan === "Premium";

  useEffect(() => {
    if (!userId || isPremium) return;
    let cancelled = false;

    const check = async () => {
      if (document.hidden || cancelled) return;
      const req = await latestApprovedRequest();
      if (!req || cancelled || req.id === seen()) return;

      // Approved and not yet acted on: remint the token, which is the only way
      // the new plan can reach this browser.
      remember(req.id);
      const { session } = await refreshSession();
      const mapped = mapSupabaseUser(session);
      if (cancelled || !mapped) return;
      setUser(mapped);
      if (mapped.plan === "Premium") {
        notify(`Votre paiement a été validé. Votre accès ${mapped.planLabel || "Premium"} est actif.`);
      }
    };

    // Straight away, then on the same rhythm as the rest of the app's polling.
    // A buyer refreshing the page while waiting for validation gets the answer
    // on that load rather than on the next tick.
    check();
    const interval = setInterval(check, 45000);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", check);
    };
    // Deliberately keyed on the account and its plan only. `notify` is rebuilt
    // on every render of AppProvider (useToast does not memoise it), so listing
    // it here would tear this effect down and re-run `check()` — a database
    // read — on every single render. The closed-over copy still works: it only
    // calls a state setter, which React keeps stable. Same trade-off the
    // device-session heartbeat in AppProvider already makes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isPremium]);
}
