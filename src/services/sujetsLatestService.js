import { useEffect, useSyncExternalStore } from "react";
import SHIPPED from "virtual:sujets-latest";
import { supabase } from "@/services/supabaseClient";
import { monthKey } from "@/services/sujetsArchiveService";

// The newest month of subjects across EE and EO, as "YYYY-MM" — what the nav's
// « Sujets de septembre » link is named after. The shipped archive's newest
// month is known at build time (scripts/sujetsLatestPlugin.mjs); months an
// admin adds later live in the sujets_archive table, so one single-row query
// (public read) checks for a newer one. Re-read after every admin save, so a
// new month renames the link at once.
const shipped = [SHIPPED.ee, SHIPPED.eo].filter(Boolean).sort().pop() || null;
let latest = shipped;
let fetched = false;
const listeners = new Set();

export async function refreshLatestSujets() {
  fetched = true;
  const { data, error } = await supabase
    .from("sujets_archive")
    .select("year, month_num")
    .order("year", { ascending: false })
    .order("month_num", { ascending: false })
    .limit(1);
  if (error) return; // table missing or offline: the shipped month stands
  const fromDb = data?.[0] ? monthKey(data[0].year, data[0].month_num) : null;
  const next = [shipped, fromDb].filter(Boolean).sort().pop() || null;
  if (next !== latest) {
    latest = next;
    for (const fn of listeners) fn();
  }
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// { year, monthNum } of the newest month, or null if there is none. The
// database is asked only once `enabled` (the link is signed-in only, so a
// visitor's page load makes no extra request).
export function useLatestSujetsMonth(enabled = true) {
  const key = useSyncExternalStore(subscribe, () => latest);
  useEffect(() => { if (enabled && !fetched) refreshLatestSujets(); }, [enabled]);
  if (!key) return null;
  const [year, monthNum] = key.split("-").map(Number);
  return { year, monthNum };
}

const FR = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const EN = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// « Sujets de septembre », « Sujets d'août » (elided before a vowel), or
// "September topics" in English. `fallback` when the month is unknown.
export function sujetsMonthLabel(month, lang, fallback) {
  if (!month || !FR[month.monthNum]) return fallback;
  if (lang === "en") return `${EN[month.monthNum]} topics`;
  const m = FR[month.monthNum];
  return /^[aeiouéèêh]/i.test(m) ? `Sujets d'${m}` : `Sujets de ${m}`;
}
