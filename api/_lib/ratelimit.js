import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./groq.js";

// Fixed-window rate limiting for the serverless API. The real counter lives
// in Postgres (bump_rate_limit(), migration 20260716_rate_limits.sql) so the
// limit holds across serverless instances; when that migration hasn't been
// applied yet the check degrades to a per-instance in-memory counter — some
// protection rather than a broken endpoint, matching how the other endpoints
// treat missing tables.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// First hop of x-forwarded-for is the real client on Vercel (same rule as
// api/login's lockout key).
export function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}

const memory = new Map(); // key -> { start, count } (fallback only)

function bumpInMemory(key, windowSeconds, limit) {
  const now = Date.now();
  const rec = memory.get(key);
  if (!rec || now - rec.start > windowSeconds * 1000) {
    memory.set(key, { start: now, count: 1 });
    return true;
  }
  rec.count += 1;
  if (memory.size > 10000) memory.clear(); // cap the fallback's footprint
  return rec.count <= limit;
}

// The counter itself: bumps `key` and reports whether the caller is still
// inside `limit` per `windowSeconds`. Exported because a quota that has to
// EXPLAIN itself — the dictée's per-tâche plan limits, which name the plan and
// tell the candidate when to come back — needs the answer rather than the
// generic 429 that enforceRateLimit throws on it.
export async function bumpLimit({ key, limit, windowSeconds }) {
  const { data, error } = await admin.rpc("bump_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: limit,
  });
  if (error) return bumpInMemory(key, windowSeconds, limit); // migration not applied yet
  return data !== false;
}

// Turns a fixed window into a real cooldown.
//
// bump_rate_limit never extends a live window, so "5 per 15 minutes" reached in
// four minutes only holds the caller for the eleven that are left. Where the
// pause IS the point — the dictée asks the candidate to go away for fifteen
// minutes, not for whatever remains of a window they cannot see — this restarts
// the window at the first refusal, making the wait the full `windowSeconds`
// from there.
//
// `count = limit + 1` is what identifies that first refusal: the bump that was
// just refused wrote exactly that, and every later attempt leaves a higher
// count. So the update matches once and someone retrying can never push their
// own pause further out.
//
// Best effort: if it does not land the caller simply gets the shorter,
// ordinary fixed-window pause.
export async function holdWindow({ key, limit }) {
  const { error } = await admin
    .from("rate_limits")
    .update({ window_start: new Date().toISOString() })
    .eq("key", key)
    .eq("count", limit + 1);
  if (error) console.warn("holdWindow:", error.message);
}

// Throws 429 once the caller exceeds `limit` calls per `windowSeconds`.
// Scope by authenticated user id when there is one (a shared IP — campus,
// CGNAT — shouldn't lock out neighbours), by IP otherwise.
export async function enforceRateLimit(req, { name, limit, windowSeconds, userId }) {
  const key = `${name}|${userId || clientIp(req)}`;
  const allowed = await bumpLimit({ key, limit, windowSeconds });
  if (!allowed) throw new HttpError(429, "Trop de requêtes. Réessayez dans un instant.");
}
