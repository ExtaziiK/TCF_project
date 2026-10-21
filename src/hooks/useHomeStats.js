import { useEffect, useState } from "react";
import { getHomeStats, getStudentCount } from "@/services/settingsService";
import { resolveStatValue } from "@/constants/contentStats";
import { HOME_STATS_DEFAULT } from "@/constants/home";

// The landing page's "Statistique" band. Live content counts are recomputed
// here, the student count is read from the database, published site counts
// come from the stored snapshot.
//
// The band sits in the hero, so it renders on the first frame instead of
// waiting for those two round trips: from the config and student count this
// browser saw last time, or the defaults on a first visit. When the fresh
// figures land they replace those, and CountUp glides to them from wherever
// its count has reached. The cost of not waiting is that a band the admin has
// just switched off can show for a moment before disappearing.
const CACHE = "home-stats";

function cached() {
  try {
    const raw = window.localStorage.getItem(CACHE);
    const v = raw && JSON.parse(raw);
    if (v?.cfg && Array.isArray(v.cfg.items)) return v;
  } catch { /* storage blocked or corrupt: use the defaults */ }
  return { cfg: HOME_STATS_DEFAULT, live: null };
}

export function useHomeStats() {
  const [state, setState] = useState(cached);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await getHomeStats();
      // Only pay for the extra round-trip when a row actually asks for it.
      const live = cfg.items.some((it) => it.src === "students")
        ? { students: await getStudentCount() }
        : null;
      if (cancelled) return;
      setState({ cfg, live });
      try { window.localStorage.setItem(CACHE, JSON.stringify({ cfg, live })); } catch { /* not critical */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const { cfg, live } = state;
  return {
    enabled: cfg.enabled,
    items: cfg.items.map((it, i) => ({ key: `${i}-${it.l}`, value: resolveStatValue(it, live), label: it.l })),
  };
}
