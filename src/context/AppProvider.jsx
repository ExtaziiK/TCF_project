import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";
import { AppContext } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useToggleSet } from "@/hooks/useToggleSet";
import { useCustomListening } from "@/hooks/useCustomListening";
import { useContentProtection } from "@/hooks/useContentProtection";
import { getSession, mapSupabaseUser, onAuthStateChange, refreshSession, signOut as authSignOut, claimDeviceSession, checkDeviceSession, consumeOAuthPending, peekOAuthPending, isNewlyCreatedUser, touchLastSeen, markPremiumPending, clearPremiumPending, isPremiumPending } from "@/services/authService";
import { confirmCheckout } from "@/services/stripeService";
import { syncSiteContent } from "@/services/questionsService";
import { deriveRole } from "@/auth/rbac";
import { loadLang, saveLang, translate } from "@/i18n";
import { loadDark, saveDark } from "@/constants/theme";
import { routeFromPath, pathForRoute, applyRouteMeta, injectStructuredData } from "@/constants/seo";

// Why this device was signed out, in the user's words. "revoked" is an admin
// disconnect from the Users panel; anything else is the device-limit eviction
// (a newer login took the slot) — see authService.checkDeviceSession.
const deviceSessionNotice = (reason) =>
  reason === "revoked"
    ? "Vous avez été déconnecté par un administrateur."
    : "Vous avez été déconnecté : votre compte a été utilisé sur un autre appareil.";

export function AppProvider({ children }) {
  const [dark, setDark] = useState(loadDark);
  const [lang, setLang] = useState(loadLang);
  // The route is derived from (and mirrored back to) the URL path, so every
  // page has a real, crawlable, shareable address — see src/constants/seo.js.
  const [route, setRoute] = useState(() => routeFromPath(window.location.pathname));
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  // True while a freshly-registered Google user must finish creating their
  // account (choose username + country) before entering the app.
  const [pendingOnboarding, setPendingOnboarding] = useState(false);
  // True from the first render of an OAuth return until the session is resolved,
  // so the app shows a "signing in…" splash instead of flashing signed-in UI
  // (e.g. the dashboard) while the device-claim network call runs.
  const [resolvingOAuth, setResolvingOAuth] = useState(peekOAuthPending);
  const [bookmarks, toggleBookmark] = useToggleSet([]);
  const [favs, toggleFav] = useToggleSet([]);
  // When set, a short "you're about to be signed out" popup is shown before the
  // device is actually logged out (admin disconnect / subscription approval),
  // so the user isn't kicked abruptly. The ref guards against re-triggering it
  // on the next heartbeat/focus tick while the popup is already counting down.
  const [forcedLogout, setForcedLogout] = useState(false);
  const forcingOut = useRef(false);

  const { toast, notify } = useToast();
  const { customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions } = useCustomListening(notify);
  useContentProtection(notify); // right-click / dev-tools deterrent — see the hook for scope & limits
  const c = useTheme(dark);

  useEffect(() => {
    getSession().then(async (session) => {
      // Consumed unconditionally so an abandoned OAuth flow can't leave the flag
      // set and act on a later reload.
      const oauth = consumeOAuthPending();
      const mapped = mapSupabaseUser(session);
      try {
        if (mapped) {
          if (oauth.pending) {
            // A Google sign-in from either the login or the register button —
            // claim this device, then, if the identity is brand new, hold it in
            // onboarding to finish creating the account (username + country).
            const isNew = isNewlyCreatedUser(session.user);
            const claim = await claimDeviceSession(mapped.id);
            // Only a DB still on the 20260724 reject policy gets here; the
            // evict-oldest version always grants the claim (see authService).
            if (claim.limitReached) {
              await authSignOut();
              setUser(null);
              setAuthReady(true);
              notify("Limite d'appareils atteinte pour votre forfait. Déconnectez-vous sur un autre de vos appareils, puis réessayez.");
              return;
            }
            setUser(mapped);
            // A brand-new Google registration must finish creating the account.
            if (isNew) setPendingOnboarding(true);
            setAuthReady(true);
            return;
          } else {
            // Either this device's slot is gone — evicted by a newer login while
            // it was away, or signed out elsewhere — or an admin disconnected
            // the account.
            const check = await checkDeviceSession(mapped.id);
            if (!check.ok) {
              // An admin disconnect / subscription approval (reason "revoked")
              // gets the grace popup, then signs out; a device-limit eviction
              // signs out immediately with a toast.
              if (check.reason === "revoked") {
                setUser(mapped);
                setAuthReady(true);
                triggerForcedLogout();
                return;
              }
              await authSignOut();
              setUser(null);
              setAuthReady(true);
              notify(deviceSessionNotice(check.reason));
              return;
            }
          }
        }
        // A purchase whose JWT never caught up (slow webhook, closed tab, a
        // refresh that collided). Premium lives in app_metadata, so the cached
        // token keeps saying "Sans papier" through any number of reloads — only
        // a remint shows it. One attempt per load, and the flag clears itself
        // once Premium lands or after six hours.
        if (mapped && mapped.plan !== "Premium" && isPremiumPending()) {
          const { session: fresh } = await refreshSession();
          const remapped = mapSupabaseUser(fresh);
          if (remapped?.plan === "Premium") {
            clearPremiumPending();
            setUser(remapped);
            setAuthReady(true);
            notify("Votre accès Premium est actif.");
            return;
          }
        }
        setUser(mapped);
        setAuthReady(true);
      } finally {
        // Always drop the OAuth splash once the session is resolved, on every
        // path (including the early returns above).
        setResolvingOAuth(false);
      }
    }).catch(() => {
      // getSession itself failed — don't strand the user on the splash.
      setResolvingOAuth(false);
      setAuthReady(true);
    });
    const subscription = onAuthStateChange((session) => setUser(mapSupabaseUser(session)));
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Device-session heartbeat: while signed in, re-check periodically and
  // whenever the tab regains focus that this device still holds one of the
  // account's slots; sign out with a notice once it doesn't. This is how an
  // EVICTED device (a newer login pushed out the oldest one — see the 20260726
  // migration) finds out: within a tick, or instantly when the tab is focused.
  // It is also how an admin DISCONNECT (20260727) reaches the device.
  // No immediate check on mount — the just-completed login's claim may still be
  // in flight, and reloads are already validated by the effect above.
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    let cancelled = false;
    // Presence ping: mark this account "seen now" so the admin Users view can
    // show live connections. Immediately, then on every heartbeat tick while the
    // tab is visible (a hidden/closed tab stops pinging and drops off "online").
    touchLastSeen();
    const check = async () => {
      if (document.hidden) return;
      touchLastSeen();
      const check = await checkDeviceSession(uid);
      if (check.ok) return;
      if (cancelled) return;
      // Admin disconnect / approval: warn with the grace popup, then sign out.
      if (check.reason === "revoked") { triggerForcedLogout(); return; }
      await authSignOut();
      setUser(null);
      notify(deviceSessionNotice(check.reason));
    };
    const interval = setInterval(check, 45000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Pull admin-authored questions (QMS) into the bank and workshop pages.
  useEffect(() => { syncSiteContent(); }, []);

  // UI language (fr = source, en = dictionary lookup). Persisted so the
  // choice survives reloads; <html lang> is kept in sync for a11y/SEO.
  useEffect(() => {
    saveLang(lang);
    document.documentElement.lang = lang;
  }, [lang]);
  const t = (text) => translate(lang, text);

  // Dark mode is persisted the same way, so a reload doesn't snap back to light.
  useEffect(() => { saveDark(dark); }, [dark]);

  // Seed the initial history entry with its canonical path (normalizing e.g.
  // a trailing slash; the query string and hash are preserved — Supabase's
  // OAuth return and the Stripe ?checkout flag both ride on them), and restore
  // the route whenever the user navigates the history. An unknown path resolves
  // to the 404 route, whose pathForRoute() is null — the requested URL is then
  // left untouched, so the visitor keeps seeing the address that failed.
  useEffect(() => {
    const path = pathForRoute(route);
    window.history.replaceState({ route }, "", path === null ? null : path + window.location.search + window.location.hash);
    const onPop = (e) => {
      setRoute(e.state?.route || routeFromPath(window.location.pathname));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the document head (title, description, canonical, robots, OG tags)
  // in sync with the current page; the structured data is injected once.
  useEffect(() => {
    injectStructuredData();
    applyRouteMeta(route);
  }, [route]);

  // Stripe Checkout redirects back to "/?checkout=success|cancelled"; the flag
  // is read once on load, then the URL is rewritten to the landing route's
  // clean path.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    // Read before the URL is rewritten below — Stripe substitutes it into
    // success_url, and it is what lets the server confirm the purchase without
    // waiting for the webhook.
    const sessionId = params.get("session_id");
    if (checkout) {
      const target = checkout === "success" ? "dashboard" : "home";
      window.history.replaceState({ route: target }, "", pathForRoute(target));
    }
    if (checkout === "cancelled") return notify("Paiement annulé.");
    if (checkout !== "success") return;

    notify("Paiement réussi ! Votre accès Premium est en cours d'activation.");
    setRoute("dashboard");
    // Survives this page: if the webhook is slow, or a refresh collides, the
    // next load finishes the activation instead of the user being told to sign
    // out and back in.
    markPremiumPending();

    // Grant the pass now instead of waiting for Stripe's webhook to race this
    // redirect. Stripe puts the session id in the success URL; the server
    // verifies it belongs to this user, applies the same idempotent patch the
    // webhook would, and answers definitively — so one round trip replaces the
    // old poll-and-hope loop that had buyers reaching for refresh.
    let stop = false;
    (async () => {
      const granted = await confirmCheckout(sessionId);
      if (stop) return;

      // One refresh either way: Premium lives in app_metadata, which is baked
      // into the access token, so the grant is invisible until the JWT is
      // reminted.
      const { session } = await refreshSession();
      const mapped = mapSupabaseUser(session);
      if (stop) return;
      if (mapped) setUser(mapped);
      if (mapped?.plan === "Premium") { clearPremiumPending(); return; }

      // Not granted yet. `pending` means Stripe has not settled an asynchronous
      // payment; anything else means confirmation failed and the webhook is now
      // the fallback. Either way the flag survives, so the next load retries.
      notify(granted.pending
        ? "Paiement en cours de validation. Votre accès s'ouvrira dès sa confirmation."
        : "Paiement reçu. L'activation prend un instant — rafraîchissez la page si l'accès n'apparaît pas.");
    })();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each route change pushes a browser history entry with the route's real
  // URL path, so pages are deep-linkable/crawlable and the in-app "Retour"
  // affordance shares one history with the browser's back/forward buttons
  // (vercel.json rewrites every path to index.html so a direct hit works).
  // `replace: true` swaps the current history entry instead of pushing a new
  // one — used after login/registration so Back doesn't return to the auth
  // page (which the user has already left by signing in).
  const nav = (r, { replace = false } = {}) => {
    if (r !== route) window.history[replace ? "replaceState" : "pushState"]({ route: r }, "", pathForRoute(r));
    setRoute(r);
    window.scrollTo({ top: 0 });
  };
  const back = () => window.history.back();

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    setPendingOnboarding(false);
  };

  // Show the grace popup once; the modal signs the device out when its 5s
  // countdown ends (or the user clicks through sooner).
  const triggerForcedLogout = () => {
    if (forcingOut.current) return;
    forcingOut.current = true;
    setForcedLogout(true);
  };
  const finishForcedLogout = async () => {
    await authSignOut();
    setUser(null);
    setPendingOnboarding(false);
    setForcedLogout(false);
    forcingOut.current = false;
  };

  // Finish a brand-new Google registration (username + country saved) and enter
  // the app at the first-login landing page.
  const completeOnboarding = () => { setPendingOnboarding(false); nav("exams", { replace: true }); };

  // Derived on every render so a premium_until expiry takes effect
  // immediately, without waiting for an auth event.
  const role = deriveRole(user);

  const value = {
    dark, setDark,
    lang, setLang, t,
    route, nav, back,
    user, setUser, authReady, signOut, role,
    pendingOnboarding, completeOnboarding,
    resolvingOAuth,
    c,
    toast, notify,
    bookmarks, toggleBookmark,
    favs, toggleFav,
    customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {forcedLogout && <ForcedLogoutModal onDone={finishForcedLogout} t={t} c={c} />}
    </AppContext.Provider>
  );
}

// A short countdown popup shown before a forced sign-out (admin disconnect /
// subscription approval). Auto-signs-out when it reaches 0; the user can click
// through sooner. `onDone` performs the actual sign-out.
const FORCED_LOGOUT_SECS = 15;
function ForcedLogoutModal({ onDone, t, c }) {
  const [left, setLeft] = useState(FORCED_LOGOUT_SECS);
  useEffect(() => {
    const iv = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    const to = setTimeout(onDone, FORCED_LOGOUT_SECS * 1000);
    return () => { clearInterval(iv); clearTimeout(to); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return createPortal(
    <div role="alertdialog" aria-modal="true" aria-live="assertive" className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-sm rounded-3xl border ${c.border} ${c.card} p-7 text-center shadow-2xl rise`}>
        <span className="w-14 h-14 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center mx-auto"><LogOut size={26} /></span>
        <h3 className={`mt-4 font-display font-bold text-lg ${c.text}`}>{t("Reconnexion nécessaire")}</h3>
        <p className={`mt-2 text-sm ${c.sub}`}>{t("Votre accès a été mis à jour. Reconnectez-vous pour l'activer.")}</p>
        <p className={`mt-3 text-xs ${c.faint}`}>{t("Déconnexion automatique dans")} {left}s</p>
        <button onClick={onDone} className="mt-5 w-full px-5 py-3 rounded-full grad-brand text-white font-semibold shadow-lg shadow-blue-600/30">{t("Se reconnecter")}</button>
      </div>
    </div>,
    document.body,
  );
}
