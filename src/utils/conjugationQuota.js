// The rules of the free tier's daily conjugation budget — the numbers and the
// two date boundaries, with no I/O.
//
// Split out of conjugationQuotaService.js so it can be imported without
// dragging in the Supabase client: these are the parts that decide when a
// paywall appears, so they are the parts worth unit-testing, and the service
// they belong to cannot be loaded outside a browser build.

export const DAILY_LIMIT_SECONDS = 10 * 60;
// How much is left when the candidate is warned. One warning, once per day.
export const WARN_AT_SECONDS_LEFT = 5 * 60;

// The candidate's LOCAL calendar day, so the reset happens at their midnight
// rather than the server's — a candidate in Montréal and one in Alger must
// each get a day that ends at their own midnight, not one that ends in the
// middle of somebody's afternoon. en-CA formats as YYYY-MM-DD, which is also
// exactly what a Postgres `date` column takes.
export const todayKey = (d = new Date()) => d.toLocaleDateString("en-CA");

// When the counter next resets, as a local Date — what the paywall shows, so
// "revenez demain" is a time rather than a vague promise.
//
// Next local MIDNIGHT, deliberately not "now + 24 h": a rolling window would
// drift a little further from the calendar day every time it was renewed, and
// would stop agreeing with todayKey() above, which is what actually resets the
// counter.
export function nextResetAt(now = new Date()) {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d;
}
