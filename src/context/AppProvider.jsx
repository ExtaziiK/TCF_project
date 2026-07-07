import { useEffect, useRef, useState } from "react";
import { AppContext } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useToggleSet } from "@/hooks/useToggleSet";
import { useCustomListening } from "@/hooks/useCustomListening";
import { getSession, mapSupabaseUser, onAuthStateChange, signOut as authSignOut } from "@/services/authService";
import { deriveRole } from "@/auth/rbac";

export function AppProvider({ children }) {
  const [dark, setDark] = useState(false);
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

  // Stripe Checkout redirects back to "/?checkout=success|cancelled" (the app
  // has no URL routing, so this is read once on load and then stripped).
  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    if (checkout === "success") {
      notify("Paiement réussi ! Votre abonnement Premium est actif.");
      setRoute("dashboard");
    } else if (checkout === "cancelled") {
      notify("Paiement annulé.");
    }
    if (checkout) window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Small navigation history so pages can offer a "Retour" affordance
  // (the SPA has no URL routing, so the browser back button can't help).
  const histRef = useRef([]);
  const nav = (r) => {
    if (r !== route) histRef.current = [...histRef.current.slice(-19), route];
    setRoute(r);
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    setRoute(histRef.current.pop() || "home");
    window.scrollTo({ top: 0 });
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
  };

  // Derived on every render so a premium_until expiry takes effect
  // immediately, without waiting for an auth event.
  const role = deriveRole(user);

  const value = {
    dark, setDark,
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
