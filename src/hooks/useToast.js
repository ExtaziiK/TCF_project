import { useEffect, useRef, useState } from "react";

export function useToast(durationMs = 2800) {
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  useEffect(() => () => clearTimeout(toastRef.current), []);
  const notify = (m) => {
    setToast(m);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), durationMs);
  };
  return { toast, notify };
}
