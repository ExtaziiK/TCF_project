import { useState } from "react";
import { AppContext } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useToggleSet } from "@/hooks/useToggleSet";
import { useCustomListening } from "@/hooks/useCustomListening";

export function AppProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [route, setRoute] = useState("home");
  const [user, setUser] = useState(null);
  const [bookmarks, toggleBookmark] = useToggleSet([]);
  const [favs, toggleFav] = useToggleSet([]);

  const { toast, notify } = useToast();
  const { customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions } = useCustomListening(notify);
  const c = useTheme(dark);

  const nav = (r) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
  };

  const value = {
    dark, setDark,
    route, nav,
    user, setUser,
    c,
    toast, notify,
    bookmarks, toggleBookmark,
    favs, toggleFav,
    customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
