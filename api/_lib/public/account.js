import { createClient } from "@supabase/supabase-js";
import { requireUser } from "../auth.js";
import { HttpError } from "../groq.js";
import { enforceRateLimit } from "../ratelimit.js";
import { sendMail, mailConfigured, deletionScheduledEmail } from "../mailer.js";

// Self-service account deletion, Facebook-style: asking to delete DEACTIVATES
// the account at once and schedules the real deletion GRACE_DAYS later. Any
// sign-in during that window cancels it. Grouped with the small public routes
// purely for the Vercel function count (see api/public/[resource].js); every
// action here requires a signed-in user.
//
//   POST /api/public/account { action: "delete" }
//        Stamps deletion_requested_at / deletion_scheduled_for on the account,
//        signs it out on every device and emails the date.
//   POST /api/public/account { action: "reactivate" }
//        Clears both stamps. The app calls this as soon as a session shows up
//        carrying them — i.e. on the next sign-in, whatever the method.
//
// The actual deletion is done by the daily cron (api/cron/reminders.js), which
// also re-checks last_sign_in_at so a sign-in whose "reactivate" call never
// landed still cancels it.
//
// State lives in app_metadata (clients cannot edit it), like the reminder
// stamps — no table, no migration. Metadata is merged, never replaced.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.tcfpasserelle.com").replace(/\/$/, "");

// app_metadata with the deletion stamps cleared — what reactivating writes
// back. Also used by the cron when a sign-in it spots cancels a deletion.
// Nulled rather than omitted: GoTrue MERGES app_metadata on update, so a key
// that is simply left out survives untouched.
export function withoutDeletion(meta) {
  return { ...(meta || {}), deletion_requested_at: null, deletion_scheduled_for: null };
}

async function handleDelete(req, res, user) {
  const meta = user.app_metadata || {};
  // Staff accounts carry the back office with them; losing the owner leaves
  // nobody able to manage admins. Same rule as the admin panel's delete.
  if (meta.role === "owner" || meta.role === "admin") {
    throw new HttpError(403, "Un compte administrateur ne peut pas être supprimé depuis le profil.");
  }

  const now = new Date();
  const scheduledFor = new Date(now.getTime() + GRACE_DAYS * DAY_MS).toISOString();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...meta, deletion_requested_at: now.toISOString(), deletion_scheduled_for: scheduledFor },
  });
  if (error) throw new HttpError(502, `Demande refusée : ${error.message}`);

  // Deactivate: sign out every device. sessions_revoked_at is the marker the
  // app's heartbeat acts on (see the 20260727 migration) and the global
  // signOut revokes refresh tokens so an idle tab can't quietly resume.
  await admin
    .from("profiles")
    .update({ sessions_revoked_at: now.toISOString(), active_session_ids: null, active_session_id: null })
    .eq("id", user.id);
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  try { await admin.auth.admin.signOut(token, "global"); } catch { /* the marker above still kicks devices */ }

  let emailed = false;
  if (user.email && mailConfigured()) {
    try {
      const { subject, html } = deletionScheduledEmail(user, scheduledFor, SITE);
      await sendMail({ to: user.email, subject, html });
      emailed = true;
    } catch (err) {
      console.error(`account: deletion email to ${user.email} failed:`, err.message);
    }
  }
  return res.status(200).json({ ok: true, scheduledFor, emailed });
}

async function handleReactivate(res, user) {
  const meta = user.app_metadata || {};
  if (!meta.deletion_scheduled_for && !meta.deletion_requested_at) return res.status(200).json({ ok: true, reactivated: false });
  const { error } = await admin.auth.admin.updateUserById(user.id, { app_metadata: withoutDeletion(meta) });
  if (error) throw new HttpError(502, `Réactivation refusée : ${error.message}`);
  return res.status(200).json({ ok: true, reactivated: true });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await requireUser(req);
    await enforceRateLimit(req, { name: "account", limit: 10, windowSeconds: 3600, userId: user.id });
    // getUser() returns the live record, so these stamps are current even if
    // the caller's JWT predates them.
    const action = req.body?.action;
    if (action === "delete") return await handleDelete(req, res, user);
    if (action === "reactivate") return await handleReactivate(res, user);
    throw new HttpError(400, "Action inconnue.");
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "Requête refusée." });
  }
}
