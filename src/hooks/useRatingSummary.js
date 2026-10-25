import { useEffect, useState } from "react";
import { approvedRatingSummary, MIN_RATINGS_FOR_AVERAGE } from "@/services/testimonialsService";

// The site-wide review score, for anywhere that wants to show it.
//
// Returns null while unknown AND whenever there are too few ratings to mean
// anything, so callers render nothing rather than deciding the threshold
// themselves — two places applying the same rule is how they drift apart.
//
// The last answer is remembered in this browser and returned on the first
// render, so the score is there as the page appears instead of popping in
// half a second later (the log-in card, the landing page, the Avis page);
// the database is still asked every time, and its answer replaces the cached
// one. A first visit has nothing cached and waits, as before.
const CACHE = "rating-summary";

function cached() {
  try {
    const v = JSON.parse(window.localStorage.getItem(CACHE) || "null");
    return v && typeof v.average === "number" ? v : null;
  } catch {
    return null;
  }
}

export function useRatingSummary() {
  const [summary, setSummary] = useState(cached);
  useEffect(() => {
    let cancelled = false;
    approvedRatingSummary().then((r) => {
      if (cancelled || !r.ok) return; // offline: keep what we had
      const next = r.count >= MIN_RATINGS_FOR_AVERAGE ? { average: r.average, count: r.count } : null;
      setSummary(next);
      try {
        if (next) window.localStorage.setItem(CACHE, JSON.stringify(next));
        else window.localStorage.removeItem(CACHE);
      } catch { /* storage blocked: no cache, nothing else changes */ }
    });
    return () => { cancelled = true; };
  }, []);
  return summary;
}
