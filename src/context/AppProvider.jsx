import { useEffect, useState } from "react";
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

  const nav = (r) => {
    setRoute(r);
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
    route, nav,
    user, setUser, authReady, signOut, role,
    c,
    toast, notify,
    bookmarks, toggleBookmark,
    favs, toggleFav,
    customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
