import { useEffect, useRef } from "react";
import { pendingGiftCode, clearPendingGiftCode, redeemGiftCode } from "@/services/giftLinkService";
import { refreshSession, mapSupabaseUser } from "@/services/authService";

// Turns a `?gift=CODE` link captured on landing (see AppProvider's URL-param
// effect, which stashes it via stashPendingGiftCode) into an actual grant,
// the moment the visitor HAS an account to grant it to — whether they just
// registered, just logged in, or already had a session open when the link
// was opened.
//
// One attempt per stashed code: the server enforces "one gift ever per
// account" anyway, so retrying would only ever repeat the same refusal —
// the code is cleared right after the attempt regardless of outcome, success
// or a definitive refusal alike, so a transient failure is not chased forever.
export function useGiftRedemption({ user, setUser, notify }) {
  const userId = user?.id;
  const attempted = useRef(false);

  useEffect(() => {
    if (!userId || attempted.current) return;
    const code = pendingGiftCode();
    if (!code) return;
    attempted.current = true;

    (async () => {
      const result = await redeemGiftCode(code);
      clearPendingGiftCode();

      if (!result.ok) {
        if (result.error && result.error !== "not-authenticated" && result.error !== "network") notify(result.error);
        return;
      }

      // Premium lives in app_metadata, baked into the access token — invisible
      // until the JWT is reminted, same as every other grant path.
      const { session } = await refreshSession();
      const mapped = mapSupabaseUser(session);
      if (mapped) setUser(mapped);
      notify(`🎁 Accès ${result.planLabel} activé gratuitement — profitez-en !`);
    })();
    // Deliberately keyed on the account only — see useDzActivation for why
    // `notify`/`setUser` are safe to leave out (rebuilt every render, but
    // React keeps state setters and the closed-over copies stable enough).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
