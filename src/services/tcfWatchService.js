import { supabase } from "@/services/supabaseClient";

// Read side of the Moncton exam-date watch. Write side is a scheduled task on
// the owner's PC (tcf-moncton-watch/watch.mjs): the site blocks non-browser
// requests and renders its calendar in JavaScript, the app's CSP allows
// connect-src to Supabase only, and the Hobby plan has no cron slot left — so
// the browsing happens off-platform and this module only ever reads the result.
//
// No new serverless function: like quizResultsService, this talks to Supabase
// directly from the browser. Row-level security (20260820_tcf_watch.sql) is
// what restricts the rows to one candidate plus staff — the route guard below
// only decides what is worth rendering.

const rowToCheck = (r) => ({
  id: r.id,
  checkedAt: r.checked_at,
  status: r.status, // "match" | "no_match" | "failed"
  cutoff: r.cutoff,
  sessions: r.sessions || [],
  qualifying: r.qualifying || [],
  sessionCount: r.session_count ?? (r.sessions || []).length,
  earliestBookable: r.earliest_bookable,
  error: r.error,
});

// Missing table (42P01) or PostgREST's schema-cache miss — the migration has
// not been applied to this database yet. Reported as its own state so the page
// can say "not set up" rather than "no dates", which would be a lie of exactly
// the kind this whole feature is built to avoid.
const isMissingTable = (error) =>
  error && (error.code === "42P01" || error.code === "PGRST205" || /tcf_watch_checks/.test(error.message || ""));

// The most recent check, plus a short history so the page can show that the
// watcher is actually still running.
export async function listWatchChecks(limit = 25) {
  const { data, error } = await supabase
    .from("tcf_watch_checks")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTable(error)) return { checks: [], backend: "missing" };
    console.warn("tcf_watch_checks:", error.message);
    return { checks: [], backend: "error", message: error.message };
  }
  return { checks: data.map(rowToCheck), backend: "supabase" };
}

// How stale the newest check is. The watcher runs on a PC that may be asleep,
// so "when did this last actually run" is as important as what it found —
// a page showing "no dates" from a check twelve hours ago is misleading.
export function minutesSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 60000)) : null;
}

// Anything older than this and the page stops presenting the result as current.
export const STALE_AFTER_MINUTES = 45;
