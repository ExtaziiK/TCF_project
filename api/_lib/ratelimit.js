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

// Throws 429 once the caller exceeds `limit` calls per `windowSeconds`.
// Scope by authenticated user id when there is one (a shared IP — campus,
// CGNAT — shouldn't lock out neighbours), by IP otherwise.
export async function enforceRateLimit(req, { name, limit, windowSeconds, userId }) {
  const key = `${name}|${userId || clientIp(req)}`;
  let allowed;
  const { data, error } = await admin.rpc("bump_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: limit,
  });
  if (error) allowed = bumpInMemory(key, windowSeconds, limit); // migration not applied yet
  else allowed = data !== false;
  if (!allowed) throw new HttpError(429, "Trop de requêtes. Réessayez dans un instant.");
}
