import { useEffect } from "react";

// Basic, client-side content protection: disables the right-click context
// menu and the common "view/inspect source" keyboard shortcuts, with a toast
// explaining why. This deters casual copying but is NOT real security — any
// visitor can disable JavaScript, use the browser's own menu to open dev
// tools, or view page source another way. Don't rely on this to protect
// anything sensitive; it only discourages casual right-click "Save as" /
// "Inspect" on the free content.
//
// Only runs in production builds (import.meta.env.PROD) so local development
// keeps normal dev-tools access. Form fields (input/textarea/contenteditable)
// are exempt from the right-click block so paste, password managers and
// screen-reader context menus keep working there.
const BLOCKED_KEY_COMBOS = [
  // View source
  (e) => e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "u",
  // Dev tools (Windows/Linux) and the Mac equivalents (Cmd instead of Ctrl)
  (e) => e.key === "F12",
  (e) => (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "i",
  (e) => (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "j",
  (e) => (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c",
];

const isFormField = (el) =>
  el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

export function useContentProtection(notify) {
  useEffect(() => {
    if (!import.meta.env.PROD) return; // keep dev tools available locally

    const warn = () => notify?.("Le clic droit a été désactivé pour protéger le contenu de ce site.");

    const onContextMenu = (e) => {
      if (isFormField(e.target)) return; // let users right-click to paste in forms
      e.preventDefault();
      warn();
    };

    const onKeyDown = (e) => {
      if (BLOCKED_KEY_COMBOS.some((match) => match(e))) {
        e.preventDefault();
        warn();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notify]);
}
