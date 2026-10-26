import { useEffect, useSyncExternalStore } from "react";
import SHIPPED from "virtual:sujets-latest";
import { getSupabase } from "@/services/supabaseClient";
import { monthKey } from "@/services/sujetsArchiveService";

// The newest month of subjects across EE and EO, as "YYYY-MM" — what the nav's
// « Sujets de septembre » link is named after. The shipped archive's newest
// month is known at build time (scripts/sujetsLatestPlugin.mjs); months an
// admin adds later live in the sujets_archive table, so one single-row query
// (public read) checks for a newer one. Re-read after every admin save, so a
// new month renames the link at once.
//
// The shipped month is only a floor: the database usually holds a newer one,
// so showing it first made the link read « Sujets d'août » for a moment and
// then jump to « Sujets d'octobre ». Instead the answer is remembered in this
// browser, and until it is known (`resolved`) the signed-in nav shows the
// plain « Sujets du mois » rather than a month that may be wrong.
const shipped = [SHIPPED.ee, SHIPPED.eo].filter(Boolean).sort().pop() || null;
const CACHE = "sujets-latest-month";
const readCache = () => { try { return window.localStorage.getItem(CACHE); } catch { return null; } };
const cached = typeof window !== "undefined" ? readCache() : null;
let latest = [shipped, cached].filter(Boolean).sort().pop() || null;
let resolved = !!cached; // a month remembered from an earlier visit is trusted until refreshed
let fetched = false;
const listeners = new Set();

export async function refreshLatestSujets() {
  fetched = true;
  const { data, error } = await (await getSupabase())
    .from("sujets_archive")
    .select("year, month_num")
    .order("year", { ascending: false })
    .order("month_num", { ascending: false })
    .limit(1);
  // Table missing or offline: what we had (shipped, or remembered) stands.
  const fromDb = !error && data?.[0] ? monthKey(data[0].year, data[0].month_num) : null;
  const next = error ? latest : [shipped, fromDb].filter(Boolean).sort().pop() || null;
  if (!error && next) { try { window.localStorage.setItem(CACHE, next); } catch { /* storage blocked */ } }
  if (next !== latest || !resolved) {
    latest = next;
    resolved = true;
    for (const fn of listeners) fn();
  }
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// { year, monthNum } of the newest month, or null if there is none — or, for
// a signed-in page (`enabled`), while it is not known yet, so the caller shows
// its plain fallback instead of a month that is about to change. The database
// is asked only once `enabled` (the link is signed-in only, so a visitor's
// page load makes no extra request); a visitor gets the best month known
// without asking.
const snapshot = () => `${resolved ? 1 : 0}|${latest || ""}`;
export function useLatestSujetsMonth(enabled = true) {
  const [ready, key] = useSyncExternalStore(subscribe, snapshot).split("|");
  useEffect(() => { if (enabled && !fetched) refreshLatestSujets(); }, [enabled]);
  if (!key || (enabled && ready !== "1")) return null;
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
