import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../_lib/auth.js";
import { HttpError } from "../_lib/groq.js";

// Admin user management. Runs server-side because listing accounts (emails)
// and editing app_metadata (plan, role) require the service-role key — the
// browser must never hold it. Every caller is verified as an admin via their
// Supabase JWT (requireAdmin), and every mutation is written to the
// admin_audit_log so privileged actions leave a trail.
//
//   GET  /api/admin/users?search=&page=1        → { users, total, page, perPage }
//   POST /api/admin/users { action, userId, … } → { ok: true }
//     action: "set-plan"  { plan: "Premium"|"Découverte", months?: number|null }
//             "set-role"  { role: "admin"|null }   (cannot change your own role)
//             "delete"    {}                        (cannot delete yourself)

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PER_PAGE = 25;
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

function toRow(u, usernames) {
  const meta = u.app_metadata || {};
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || u.user_metadata?.full_name || null,
    username: usernames[u.id] || null,
    plan: meta.plan || "Découverte",
    premiumUntil: meta.premium_until || null,
    premiumActive: premiumActive(meta),
    admin: meta.role === "admin",
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at || null,
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

  let users = await listAllUsers();
  users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Usernames come from profiles; fetched for the full window so search can
  // match them too (one indexed query, id list bounded by MAX_SCAN).
  const { data: profileRows } = await admin.from("profiles").select("id, username").in("id", users.map((u) => u.id));
  const usernames = Object.fromEntries((profileRows || []).map((p) => [p.id, p.username]));

  if (search) {
    users = users.filter((u) =>
      (u.email || "").toLowerCase().includes(search) ||
      (u.user_metadata?.name || "").toLowerCase().includes(search) ||
      (usernames[u.id] || "").toLowerCase().includes(search)
    );
  }

  const total = users.length;
  const slice = users.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  res.status(200).json({ users: slice.map((u) => toRow(u, usernames)), total, page, perPage: PER_PAGE });
}

async function handlePost(req, res, actor) {
  const { action, userId } = req.body || {};
  if (!action || !userId) throw new HttpError(400, "action et userId sont requis.");

  if (action === "set-plan") {
    const { plan, months } = req.body;
    if (!["Premium", "Découverte"].includes(plan)) throw new HttpError(400, "Forfait inconnu.");
    const until =
      plan === "Premium" && Number(months) > 0
        ? new Date(Date.now() + Number(months) * 30 * 24 * 3600 * 1000).toISOString()
        : null;
    const user = await patchMetadata(userId, { plan, premium_until: until });
    await audit(actor, "set-plan", user.email, { plan, months: Number(months) || null, premium_until: until });
    return res.status(200).json({ ok: true });
  }

  if (action === "set-role") {
    // An admin can never edit their own role: demoting yourself locks you out,
    // and self-service promotion paths are how privilege bugs are born.
    if (userId === actor.id) throw new HttpError(400, "Vous ne pouvez pas modifier votre propre rôle.");
    const role = req.body.role === "admin" ? "admin" : null;
    const user = await patchMetadata(userId, { role });
    await audit(actor, "set-role", user.email, { role });
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
