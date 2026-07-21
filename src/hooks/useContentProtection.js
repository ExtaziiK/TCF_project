import { useEffect } from "react";

// Basic, client-side content protection: disables the right-click context
// menu, the common "view/inspect source" keyboard shortcuts, AND text
// selection / copying of the site content, with a toast explaining why. This
// deters casual copying but is NOT real security — any visitor can disable
// JavaScript, use the browser's own menu to open dev tools, or view page
// source another way. Don't rely on this to protect anything sensitive.
//
// Only runs in production builds (import.meta.env.PROD) so local development
// keeps normal dev-tools access and text selection. Form fields
// (input/textarea/contenteditable) are exempt everywhere: users must still be
// able to select, copy and paste inside their OWN inputs (login, the writing
// area, etc.) — the `.no-select` CSS re-enables selection there (see index.css)
// and the copy/context-menu handlers below skip them.
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
    const warnCopy = () => notify?.("La copie du contenu est désactivée sur ce site.");

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

    // Block copy/cut of site content (Ctrl/Cmd+C, the drag-select copy, etc.),
    // but never inside form fields — users copy/paste their own input there.
    const onCopy = (e) => {
      if (isFormField(e.target)) return;
      e.preventDefault();
      warnCopy();
    };

    // Turn off text selection site-wide via CSS; form fields opt back in.
    document.body.classList.add("no-select");
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    return () => {
      document.body.classList.remove("no-select");
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
    };
  }, [notify]);
}
