import { useEffect, useRef, useState } from "react";

// notify(message) shows a success toast; notify(message, "error") shows a
// failure one. The tone matters: the toast used to render a green check on
// every message, so a failed action looked exactly like a successful one.
export function useToast(durationMs = 2800) {
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  useEffect(() => () => clearTimeout(toastRef.current), []);
  const notify = (message, tone = "success") => {
    // Guard against a non-string slipping through (an Error, a parsed error
    // body): React can't render an object, and stringifying one produces
    // useless text like "{}" — which is what a caller passing a raw Supabase
    // error used to put on screen.
    const text = typeof message === "string" ? message : String(message?.message ?? message ?? "");
    if (!text) return;
    setToast({ text, tone });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), durationMs);
  };
  return { toast, notify };
}
