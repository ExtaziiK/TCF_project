import { useEffect, useState } from "react";
import { getHomeStats, getStudentCount } from "@/services/settingsService";
import { resolveStatValue } from "@/constants/contentStats";

// The landing page's "Statistique" band. Returns null until the saved config
// lands, so a band the admin turned off never flashes on screen first; once
// loaded, `items` carry their resolved display value (live content counts are
// recomputed here, the student count is read from the database, published site
// counts come from the stored snapshot).
export function useHomeStats() {
  const [state, setState] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await getHomeStats();
      // Only pay for the extra round-trip when a row actually asks for it, and
      // resolve it before the first paint so the band never shows the stale
      // fallback figure and then jumps to the live one.
      const live = cfg.items.some((it) => it.src === "students")
        ? { students: await getStudentCount() }
        : null;
      if (!cancelled) setState({ cfg, live });
    })();
    return () => { cancelled = true; };
  }, []);
  if (!state) return null;
  const { cfg, live } = state;
  return {
    enabled: cfg.enabled,
    items: cfg.items.map((it, i) => ({ key: `${i}-${it.l}`, value: resolveStatValue(it, live), label: it.l })),
  };
}
