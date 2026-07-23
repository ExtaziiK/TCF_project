import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";

// Admin user management. Runs server-side because listing accounts (emails)
// and editing app_metadata (plan, role) require the service-role key — the
// browser must never hold it. Every caller is verified as an admin via their
// Supabase JWT (requireAdmin), and every mutation is written to the
// admin_audit_log so privileged actions leave a trail.
//
//   GET  /api/admin/users?search=&page=1        → { users, total, page, perPage }
//   POST /api/admin/users { action, userId, … } → { ok: true }
//     action: "set-plan"        { plan: "Premium"|"Sans papier", days?|months?: number|null, label? }
//             "set-role"        { role: "admin"|null }   (owner only; not your own role)
//             "reset-sessions"  {}    clears active device slots (unblocks a locked-out user)
//             "delete"          {}                        (cannot delete yourself)

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// The four paid pricing tiers (src/constants/pricing.js). Access is still the
// single "Premium" role — the tier only differs by access duration and is kept
// as a display label. Whitelisted here so an admin call can't stash arbitrary
// metadata on the account.
const PLAN_LABELS = ["Passeport", "Visa", "Première classe", "VIP"];

// A connection counts as "online" when the app pinged last_seen_at within this
// window (the client pings every 45s; three-plus missed pings = offline).
const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const RECENT_LOGINS = 8;

// Account-type filters for the Users view. Each maps a chip the admin clicks to
// a predicate over the account's metadata (+ whether Premium is currently
// active). Keys are the querystring values sent by the client.
const TYPE_FILTERS = {
  all: () => true,
  "sans-papier": (meta, active) => !active && meta.role !== "admin" && meta.role !== "owner",
  premium: (meta, active) => active,
  passeport: (meta, active) => active && meta.plan_label === "Passeport",
  visa: (meta, active) => active && meta.plan_label === "Visa",
  "premiere-classe": (meta, active) => active && meta.plan_label === "Première classe",
  vip: (meta, active) => active && meta.plan_label === "VIP",
  admin: (meta) => meta.role === "admin",
  owner: (meta) => meta.role === "owner",
};

const PER_PAGE = 5;
// listUsers has no server-side search, so pages are fetched and filtered
// here. The cap keeps one request bounded; beyond it, search still works on
// the loaded window and the UI shows the true total.
const MAX_SCAN = 5000;

async function listAllUsers() {
  const users = [];
  for (let page = 1; users.length < MAX_SCAN; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new HttpError(502, `Lecture des comptes impossible : ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

const premiumActive = (meta) =>
  meta.plan === "Premium" && (!meta.premium_until || Date.parse(meta.premium_until) > Date.now());

const isOnline = (lastSeenAt) => !!lastSeenAt && Date.now() - Date.parse(lastSeenAt) < ONLINE_WINDOW_MS;

function toRow(u, profiles) {
  const meta = u.app_metadata || {};
  const p = profiles[u.id] || {};
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || u.user_metadata?.full_name || null,
    username: p.username || null,
    plan: meta.plan || "Sans papier",
    planLabel: meta.plan_label || null,
    premiumUntil: meta.premium_until || null,
    premiumActive: premiumActive(meta),
    admin: meta.role === "admin",
    owner: meta.role === "owner",
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at || null,
    lastSeenAt: p.last_seen_at || null,
    online: isOnline(p.last_seen_at),
  };
}

async function audit(actor, action, target, detail) {
  await admin.from("admin_audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    target,
    detail: detail || null,
  });
}

// Merges (never replaces) app_metadata so unrelated fields survive an edit —
// same rule as the Stripe webhook.
async function patchMetadata(userId, patch) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) throw new HttpError(404, "Utilisateur introuvable.");
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...data.user.app_metadata, ...patch },
  });
  if (updateError) throw new HttpError(502, `Mise à jour refusée : ${updateError.message}`);
  return data.user;
}

async function handleGet(req, res) {
  const search = String(req.query.search || "").trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const filterKey = TYPE_FILTERS[req.query.filter] ? req.query.filter : "all";
  const matchesType = TYPE_FILTERS[filterKey];

  let users = await listAllUsers();
  users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Usernames + presence come from profiles; fetched for the full window so
  // search can match usernames and "online now" is computed over everyone
  // (one indexed query, id list bounded by MAX_SCAN).
  const { data: profileRows } = await admin.from("profiles").select("id, username, last_seen_at").in("id", users.map((u) => u.id));
  const profiles = Object.fromEntries((profileRows || []).map((p) => [p.id, p]));

  // Live connections + most recent logins are reported over ALL accounts,
  // independent of the active search/type filter, so the header stays stable.
  const onlineRows = users
    .filter((u) => isOnline(profiles[u.id]?.last_seen_at))
    .sort((a, b) => Date.parse(profiles[b.id]?.last_seen_at) - Date.parse(profiles[a.id]?.last_seen_at));
  const onlineCount = onlineRows.length;
  const onlineUsers = onlineRows.slice(0, 12).map((u) => toRow(u, profiles));
  const recentLogins = [...users]
    .filter((u) => u.last_sign_in_at)
    .sort((a, b) => new Date(b.last_sign_in_at) - new Date(a.last_sign_in_at))
    .slice(0, RECENT_LOGINS)
    .map((u) => toRow(u, profiles));

  if (filterKey !== "all") {
    users = users.filter((u) => matchesType(u.app_metadata || {}, premiumActive(u.app_metadata || {})));
  }
  if (search) {
    users = users.filter((u) =>
      (u.email || "").toLowerCase().includes(search) ||
      (u.user_metadata?.name || "").toLowerCase().includes(search) ||
      (profiles[u.id]?.username || "").toLowerCase().includes(search)
    );
  }

  const total = users.length;
  const slice = users.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  res.status(200).json({
    users: slice.map((u) => toRow(u, profiles)),
    total, page, perPage: PER_PAGE,
    filter: filterKey,
    onlineCount,
    onlineUsers,
    recentLogins,
  });
}

async function handlePost(req, res, actor) {
  const { action, userId } = req.body || {};
  if (!action || !userId) throw new HttpError(400, "action et userId sont requis.");

  if (action === "set-plan") {
    const { plan, months, days } = req.body;
    if (!["Premium", "Sans papier", "Découverte"].includes(plan)) throw new HttpError(400, "Forfait inconnu.");
    // Access window: `days` (pricing tiers: 5/15/30/90) takes precedence, else
    // `months` (legacy). Neither → no expiry (unlimited Premium).
    const durationMs = Number(days) > 0 ? Number(days) * 24 * 3600 * 1000
      : Number(months) > 0 ? Number(months) * 30 * 24 * 3600 * 1000 : 0;
    const isPremium = plan === "Premium";
    const until = isPremium && durationMs > 0 ? new Date(Date.now() + durationMs).toISOString() : null;
    const label = isPremium && PLAN_LABELS.includes(req.body.label) ? req.body.label : null;
    const user = await patchMetadata(userId, { plan, premium_until: until, plan_label: label });
    await audit(actor, "set-plan", user.email, { plan, days: Number(days) || null, months: Number(months) || null, label, premium_until: until });
    return res.status(200).json({ ok: true });
  }

  if (action === "set-role") {
    // Only the owner may promote/demote admins. A regular admin calling this
    // (e.g. by hand-crafting the request) is refused server-side, not just in
    // the UI where the button is hidden.
    if (actor.app_metadata?.role !== "owner") throw new HttpError(403, "Seul le propriétaire peut gérer les administrateurs.");
    // An admin can never edit their own role: demoting yourself locks you out,
    // and self-service promotion paths are how privilege bugs are born.
    if (userId === actor.id) throw new HttpError(400, "Vous ne pouvez pas modifier votre propre rôle.");
    // This endpoint only toggles the admin role; an owner is created solely via
    // the service role, so it must never be demoted through here by accident.
    const { data: targetData } = await admin.auth.admin.getUserById(userId);
    if (targetData?.user?.app_metadata?.role === "owner") throw new HttpError(400, "Le rôle propriétaire ne peut pas être modifié ici.");
    const role = req.body.role === "admin" ? "admin" : null;
    const user = await patchMetadata(userId, { role });
    await audit(actor, "set-role", user.email, { role });
    return res.status(200).json({ ok: true });
  }

  if (action === "reset-sessions") {
    // Clear the account's device slots so a user who lost access to their
    // devices (cleared storage, lost phone) can sign in again — the reject
    // policy otherwise leaves those slots stuck. Service-role update: the
    // client-side revoke (20260714) doesn't apply to this key.
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data?.user?.email || userId;
    const { error } = await admin.from("profiles").update({ active_session_ids: null, active_session_id: null }).eq("id", userId);
    if (error) throw new HttpError(502, `Réinitialisation des appareils refusée : ${error.message}`);
    await audit(actor, "reset-sessions", email);
    return res.status(200).json({ ok: true });
  }

  if (action === "delete") {
    if (userId === actor.id) throw new HttpError(400, "Vous ne pouvez pas supprimer votre propre compte ici.");
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data?.user?.email || userId;
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new HttpError(502, `Suppression refusée : ${error.message}`);
    await audit(actor, "delete-user", email);
    return res.status(200).json({ ok: true });
  }

  throw new HttpError(400, "Action inconnue.");
}

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);
    if (req.method === "GET") return await handleGet(req, res);
    if (req.method === "POST") return await handlePost(req, res, actor);
    throw new HttpError(405, "Method not allowed");
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Admin request failed." });
  }
}
