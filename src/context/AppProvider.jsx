import { useEffect, useState } from "react";
import { AppContext } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useToggleSet } from "@/hooks/useToggleSet";
import { useCustomListening } from "@/hooks/useCustomListening";
import { getSession, mapSupabaseUser, onAuthStateChange, refreshSession, signOut as authSignOut } from "@/services/authService";
import { syncSiteContent } from "@/services/questionsService";
import { deriveRole } from "@/auth/rbac";
import { loadLang, saveLang, translate } from "@/i18n";

export function AppProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState(loadLang);
  const [route, setRoute] = useState("home");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [bookmarks, toggleBookmark] = useToggleSet([]);
  const [favs, toggleFav] = useToggleSet([]);

  const { toast, notify } = useToast();
  const { customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions } = useCustomListening(notify);
  const c = useTheme(dark);

  useEffect(() => {
    getSession().then((session) => {
      setUser(mapSupabaseUser(session));
      setAuthReady(true);
    });
    const subscription = onAuthStateChange((session) => setUser(mapSupabaseUser(session)));
    return () => subscription.unsubscribe();
  }, []);

  // Pull admin-authored questions (QMS) into the bank and workshop pages.
  useEffect(() => { syncSiteContent(); }, []);

  // UI language (fr = source, en = dictionary lookup). Persisted so the
  // choice survives reloads; <html lang> is kept in sync for a11y/SEO.
  useEffect(() => {
    saveLang(lang);
    document.documentElement.lang = lang;
  }, [lang]);
  const t = (text) => translate(lang, text);

  // The app stores its route in state and never changes the URL path; without
  // this the browser back/forward buttons stay greyed out. Seed the initial
  // entry and restore the route whenever the user navigates the history.
  useEffect(() => {
    window.history.replaceState({ route }, "");
    const onPop = (e) => {
      setRoute(e.state?.route || "home");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stripe Checkout redirects back to "/?checkout=success|cancelled" (the app
  // has no URL routing, so this is read once on load and then stripped).
  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    if (checkout) window.history.replaceState({ route: checkout === "success" ? "dashboard" : "home" }, "", window.location.pathname);
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

  // Each route change pushes a browser history entry, so the in-app "Retour"
  // affordance and the browser's own back/forward buttons share one history.
  // The URL path is left unchanged (no server rewrites needed).
  const nav = (r) => {
    if (r !== route) window.history.pushState({ route: r }, "");
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
