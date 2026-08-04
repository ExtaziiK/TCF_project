import { useEffect, useState } from "react";
import { approvedRatingSummary, MIN_RATINGS_FOR_AVERAGE } from "@/services/testimonialsService";

// The site-wide review score, for anywhere that wants to show it.
//
// Returns null while loading AND whenever there are too few ratings to mean
// anything, so callers render nothing rather than deciding the threshold
// themselves — two places applying the same rule is how they drift apart.
export function useRatingSummary() {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    let cancelled = false;
    approvedRatingSummary().then((r) => {
      if (cancelled) return;
      if (r.ok && r.count >= MIN_RATINGS_FOR_AVERAGE) setSummary({ average: r.average, count: r.count });
    });
    return () => { cancelled = true; };
  }, []);
  return summary;
}
