import { useEffect, useState } from "react";
import { approvedRatingSummary, MIN_RATINGS_FOR_AVERAGE } from "@/services/testimonialsService";

// The site-wide review score, for anywhere that wants to show it.
//
// Returns null while unknown AND whenever there are too few ratings to mean
// anything, so callers render nothing rather than deciding the threshold
// themselves — two places applying the same rule is how they drift apart.
//
// Asked of the database ONCE per page load and shared: the landing page, the
// Avis page and the log-in card all read the same answer, so going from one
// to another reuses it at once instead of fetching it again. Before that
// answer arrives, the last one this browser saw is shown (localStorage), so
// even the first page has its score from the first frame — only a very first
// visit waits for the request.
const CACHE = "rating-summary";

function fromStorage() {
  try {
    const v = JSON.parse(window.localStorage.getItem(CACHE) || "null");
    return v && typeof v.average === "number" ? v : null;
  } catch {
    return null;
  }
}

let current = typeof window !== "undefined" ? fromStorage() : null; // best known value
let request = null; // the one database request of this page load

function load() {
  if (!request) {
    request = approvedRatingSummary().then((r) => {
      if (!r.ok) return current; // offline: keep what we had
      current = r.count >= MIN_RATINGS_FOR_AVERAGE ? { average: r.average, count: r.count } : null;
      try {
        if (current) window.localStorage.setItem(CACHE, JSON.stringify(current));
        else window.localStorage.removeItem(CACHE);
      } catch { /* storage blocked: the in-memory copy still serves this visit */ }
      return current;
    });
  }
  return request;
}

export function useRatingSummary() {
  const [summary, setSummary] = useState(current);
  useEffect(() => {
    let cancelled = false;
    load().then((v) => { if (!cancelled) setSummary(v); });
    return () => { cancelled = true; };
  }, []);
  return summary;
}
