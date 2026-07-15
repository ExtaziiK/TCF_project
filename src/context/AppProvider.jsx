import { useEffect, useState } from "react";
import { AppContext } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useToggleSet } from "@/hooks/useToggleSet";
import { useCustomListening } from "@/hooks/useCustomListening";
import { useContentProtection } from "@/hooks/useContentProtection";
import { getSession, mapSupabaseUser, onAuthStateChange, refreshSession, signOut as authSignOut, claimDeviceSession, isDeviceSessionActive, consumeOAuthPending } from "@/services/authService";
import { syncSiteContent } from "@/services/questionsService";
import { deriveRole } from "@/auth/rbac";
import { loadLang, saveLang, translate } from "@/i18n";
import { loadDark, saveDark } from "@/constants/theme";
import { routeFromPath, pathForRoute, applyRouteMeta, injectStructuredData } from "@/constants/seo";

export function AppProvider({ children }) {
  const [dark, setDark] = useState(loadDark);
  const [lang, setLang] = useState(loadLang);
  // The route is derived from (and mirrored back to) the URL path, so every
  // page has a real, crawlable, shareable address — see src/constants/seo.js.
  const [route, setRoute] = useState(() => routeFromPath(window.location.pathname));
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [bookmarks, toggleBookmark] = useToggleSet([]);
  const [favs, toggleFav] = useToggleSet([]);

  const { toast, notify } = useToast();
  const { customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions } = useCustomListening(notify);
  useContentProtection(notify); // right-click / dev-tools deterrent — see the hook for scope & limits
  const c = useTheme(dark);

  useEffect(() => {
    getSession().then(async (session) => {
      // Consumed unconditionally so an abandoned OAuth flow can't leave the flag
      // set and trigger a spurious claim on a later reload.
      const wasOAuth = consumeOAuthPending();
      const mapped = mapSupabaseUser(session);
      if (mapped) {
        if (wasOAuth) {
          // Fresh Google login just redirected back — claim this device.
          await claimDeviceSession(mapped.id);
        } else if (!(await isDeviceSessionActive(mapped.id))) {
          // The account was claimed by another device while this one was away.
          await authSignOut();
          setUser(null);
          setAuthReady(true);
          notify("Vous avez été déconnecté : votre compte a été utilisé sur un autre appareil.");
          return;
        }
      }
      setUser(mapped);
      setAuthReady(true);
    });
    const subscription = onAuthStateChange((session) => setUser(mapSupabaseUser(session)));
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single-active-session heartbeat: while signed in, re-check periodically and
  // whenever the tab regains focus that this device still holds the account's
  // session; sign out with a notice if a newer login elsewhere superseded it.
  // No immediate check on mount — the just-completed login's claim may still be
  // in flight, and reloads are already validated by the effect above.
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    let cancelled = false;
    const check = async () => {
      if (document.hidden) return;
      if (await isDeviceSessionActive(uid)) return;
      if (cancelled) return;
      await authSignOut();
      setUser(null);
      notify("Vous avez été déconnecté : votre compte a été utilisé sur un autre appareil.");
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
  // the route whenever the user navigates the history.
  useEffect(() => {
    window.history.replaceState({ route }, "", pathForRoute(route) + window.location.search + window.location.hash);
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
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    if (checkout) {
      const target = checkout === "success" ? "dashboard" : "home";
      window.history.replaceState({ route: target }, "", pathForRoute(target));
    }
    if (checkout === "cancelled") return notify("Paiement annulé.");
    if (checkout !== "success") return;

    notify("Paiement réussi ! Votre abonnement Premium est actif.");
    setRoute("dashboard");

    // The webhook that grants Premium runs asynchronously and can land just
    // after this redirect, so the cached session may still be stale - poll
    // a few times instead of trusting the first refresh.
    let stop = false;
    (async () => {
      for (let attempt = 0; attempt < 5 && !stop; attempt++) {
        const session = await refreshSession();
        const mapped = mapSupabaseUser(session);
        if (mapped) setUser(mapped);
        if (mapped?.plan === "Premium") break;
        await new Promise((r) => setTimeout(r, 1500));
      }
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
  };

  // Derived on every render so a premium_until expiry takes effect
  // immediately, without waiting for an auth event.
  const role = deriveRole(user);

  const value = {
    dark, setDark,
    lang, setLang, t,
    route, nav, back,
    user, setUser, authReady, signOut, role,
    c,
    toast, notify,
    bookmarks, toggleBookmark,
    favs, toggleFav,
    customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
