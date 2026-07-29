import { useEffect, useState } from "react";
import { getHomeStats } from "@/services/settingsService";
import { resolveStatValue } from "@/constants/contentStats";

// The landing page's "chiffres clés" band. Returns null until the saved config
// lands, so a band the admin turned off never flashes on screen first; once
// loaded, `items` carry their resolved display value (live content counts are
// recomputed here, published site counts come from the stored snapshot).
export function useHomeStats() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getHomeStats().then((v) => { if (!cancelled) setCfg(v); });
    return () => { cancelled = true; };
  }, []);
  if (!cfg) return null;
  return {
    enabled: cfg.enabled,
    items: cfg.items.map((it, i) => ({ key: `${i}-${it.l}`, value: resolveStatValue(it), label: it.l })),
  };
}
