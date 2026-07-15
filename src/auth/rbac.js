// Central role-based access control. Everything that decides "who can see
// what" lives here: role derivation, the per-route access policy, and the
// fallback shown when access is denied. Nav filtering and the route guard
// both consume this module so the rules can never drift apart.
//
// Roles come from the Supabase session (see authService.mapSupabaseUser):
// `admin` and `plan` are read from app_metadata, which only the server /
// dashboard can set — a user cannot promote themselves from the client.

export const ROLES = {
  VISITOR: "VISITOR",
  FREE_USER: "FREE_USER",
  PREMIUM_USER: "PREMIUM_USER",
  ADMIN: "ADMIN",
};

// A subscription is active when the plan is Premium and, if an expiry is
// set (app_metadata.premium_until, ISO date), it is still in the future.
// Expiry is re-evaluated on every render, so access drops the moment the
// date passes — no refresh of the session required.
export function hasActiveSubscription(user) {
  if (!user || user.plan !== "Premium") return false;
  if (!user.premiumUntil) return true;
  const until = Date.parse(user.premiumUntil);
  return Number.isFinite(until) && until > Date.now();
}

export function deriveRole(user) {
  if (!user) return ROLES.VISITOR;
  if (user.admin) return ROLES.ADMIN;
  if (hasActiveSubscription(user)) return ROLES.PREMIUM_USER;
  return ROLES.FREE_USER;
}

const AUTHENTICATED = [ROLES.FREE_USER, ROLES.PREMIUM_USER, ROLES.ADMIN];
const PREMIUM = [ROLES.PREMIUM_USER, ROLES.ADMIN];
const ADMIN_ONLY = [ROLES.ADMIN];

// Route policy. Routes not listed here are public. The route guard refuses
// to render any route whose policy the current role does not satisfy, so
// typing a URL / route name by hand goes through the same check as the nav.
export const PAGE_ACCESS = {
  practice: AUTHENTICATED,
  // The unified épreuves hub (CO/CE/EO/EE). Open to any signed-in user; free
  // users get in but only quiz 1 of each épreuve is playable (locks live in
  // BankExplorer). Visitors fall through to the register gate.
  exams: AUTHENTICATED,
  listening: PREMIUM,
  reading: PREMIUM,
  writing: PREMIUM,
  speaking: PREMIUM,
  vocabulary: PREMIUM,
  grammar: PREMIUM,
  mocks: PREMIUM,
  bank: ADMIN_ONLY,
  dashboard: AUTHENTICATED,
  profile: AUTHENTICATED,
  admin: ADMIN_ONLY,
};

export function canAccess(role, route) {
  const allowed = PAGE_ACCESS[route];
  return !allowed || allowed.includes(role);
}

// What to show instead when access is denied:
// - "register": visitor landing — create a free account (free-tier content)
// - "login":    account pages that just need authentication
// - "upgrade":  premium content, shown to free users
// - "forbidden": admin-only surface, shown to authenticated non-admins
export function deniedReason(role, route) {
  if (canAccess(role, route)) return null;
  if (role === ROLES.VISITOR) {
    return route === "dashboard" || route === "profile" ? "login" : "register";
  }
  if (PAGE_ACCESS[route] === ADMIN_ONLY) return "forbidden";
  return "upgrade";
}
