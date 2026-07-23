import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./groq.js";

// Validates the caller's Supabase session (Bearer token) and returns the user.
// The Expression workshops are Premium in the UI; requiring a real session
// here keeps the billable Groq key from being driven by anonymous traffic
// that never loaded the app.
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function requireUser(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) throw new HttpError(401, "Authentication required.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Invalid or expired session.");
  const user = data.user;

  // Multi-device sessions: the profile holds up to N active session ids (N from
  // the plan tier). The caller must present one of them. A device that rolled
  // off the set — because the user signed it out, or an admin reset the account
  // — is refused here even though its JWT hasn't expired yet, so it can't keep
  // driving the billable endpoint. Accounts with no set on record (null, e.g.
  // pre-migration) are left unaffected. Errors reading the column fail open.
  const { data: profile } = await admin.from("profiles").select("active_session_ids").eq("id", user.id).maybeSingle();
  const active = profile?.active_session_ids || null;
  if (Array.isArray(active) && active.length) {
    const presented = String(req.headers["x-device-session"] || "").trim();
    if (!active.includes(presented)) throw new HttpError(401, "Session ouverte sur un autre appareil.");
  }
  return user;
}

// Mirrors src/auth/rbac.js (hasActiveSubscription + admin): Premium is only
// active while premium_until — when set — is in the future. Evaluated from
// app_metadata, which clients cannot self-edit.
export function isPremiumUser(user) {
  const meta = user?.app_metadata || {};
  if (meta.role === "admin" || meta.role === "owner") return true;
  if (meta.plan !== "Premium") return false;
  if (!meta.premium_until) return true;
  const until = Date.parse(meta.premium_until);
  return Number.isFinite(until) && until > Date.now();
}

// requireUser + an active Premium plan (or admin). The Expression workshops
// are Premium in the UI; without this check any free account could drive the
// billable Groq endpoints directly, bypassing the client-side gate.
export async function requirePremium(req) {
  const user = await requireUser(req);
  if (!isPremiumUser(user)) throw new HttpError(403, "Réservé à l'abonnement Premium.");
  return user;
}

// requireUser + a back-office role (admin or owner; app_metadata,
// server-controlled). Gates the service-role admin API (api/admin/*): user
// management and platform stats. An owner has every admin capability.
export async function requireAdmin(req) {
  const user = await requireUser(req);
  const role = user.app_metadata?.role;
  if (role !== "admin" && role !== "owner") throw new HttpError(403, "Réservé à l'administration.");
  return user;
}

// requireUser + the owner role. The owner is the only account allowed to
// assign or revoke admins, so admin-management actions gate on this.
export async function requireOwner(req) {
  const user = await requireUser(req);
  if (user.app_metadata?.role !== "owner") throw new HttpError(403, "Réservé au propriétaire.");
  return user;
}
