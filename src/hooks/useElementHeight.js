import { useEffect, useRef, useState } from "react";

// The rendered height of an element, kept current as its content grows or
// shrinks. 0 until the first layout (and where ResizeObserver is missing).
// Returns [ref, height].
export function useElementHeight() {
  const ref = useRef(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("ResizeObserver" in window)) return;
    const ro = new window.ResizeObserver(([e]) => setH(Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, h];
}
