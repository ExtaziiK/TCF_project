import { useEffect } from "react";

// Client-side deterrent against casually lifting the site's source: blocks the
// "view source" and dev-tools keyboard shortcuts. NOT real security — any
// visitor can disable JavaScript or open dev tools from the browser's own menu.
// Don't rely on it to protect anything sensitive.
//
// Copying is deliberately NOT blocked. This hook used to disable text
// selection, the copy/cut events and the right-click menu site-wide; that made
// the site hostile to ordinary use (quoting a consigne, looking a word up,
// right-clicking to open a link) while stopping nobody who actually wanted the
// text — it is all in the page source either way.
//
// Only runs in production builds so local development keeps dev-tools access.
const BLOCKED_KEY_COMBOS = [
  // View source
  (e) => e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "u",
  // Dev tools (Windows/Linux) and the Mac equivalents (Cmd instead of Ctrl)
  (e) => e.key === "F12",
  (e) => (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "i",
  (e) => (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "j",
  (e) => (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c",
];

export function useContentProtection(notify) {
  useEffect(() => {
    if (!import.meta.env.PROD) return; // keep dev tools available locally

    const onKeyDown = (e) => {
      if (BLOCKED_KEY_COMBOS.some((match) => match(e))) {
        e.preventDefault();
        notify?.("Cette fonction a été désactivée pour protéger le contenu de ce site.");
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [notify]);
}
