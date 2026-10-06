import { createClient } from "@supabase/supabase-js";
import { sendMail, mailConfigured } from "../_lib/mailer.js";
import { composeEmail } from "../_lib/emails.js";
import { currentPlanLabel } from "../_lib/planLabel.js";
import { withoutDeletion } from "../_lib/public/account.js";

// Daily cron (see vercel.json → crons). Scans every account's Premium expiry
// (app_metadata.premium_until, the same field the admin API and rbac read) and
// sends two one-off emails:
//   • "expiring soon"  when 0 < daysLeft <= 3
//   • "expired"        when -3 <= daysLeft <= 0  (only recently expired, so old
//                      accounts aren't spammed the first time this ever runs)
//
// The wording of every email here is edited in Administration → Emails
// (api/_lib/emailTemplates.js). One switched off there is skipped WITHOUT its
// stamp, so switching it back on still reaches accounts inside the window.
//
// De-duplication lives on the account itself: reminder_expiring_at /
// reminder_expired_at store the premium_until value they were sent for. A
// renewal changes premium_until, which re-arms both reminders automatically —
// no extra table, no RLS to reason about. Metadata is merged, never replaced,
// so plan/role/stripe fields survive (same rule as the Stripe webhook).
//
// It also finishes self-service account deletions (api/_lib/public/account.js)
// — it lives here rather than in a cron of its own because the Hobby plan caps
// a project at two. An account whose deletion_scheduled_for has passed gets the
// "account deleted" email, then is erased (every table cascades or nulls its
// user_id). One that signed in AFTER asking is reactivated instead: the app
// normally clears the request on sign-in, this catches the case where that
// call never landed.
//
// Security: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the env
// var is set. We reject anything else so the endpoint can't be triggered by the
// public. Set CRON_SECRET in the Vercel project (and .env.local for local runs).

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.tcfpasserelle.com").replace(/\/$/, "");

async function listAllUsers() {
  const users = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

const planOf = (meta) => currentPlanLabel(meta.plan_label) || "Premium";

async function patchMetadata(user, patch) {
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, ...patch },
  });
}

export async function processDeletions(users, now, summary, cache = new Map()) {
  for (const user of users) {
    const meta = user.app_metadata || {};
    if (!meta.deletion_scheduled_for) continue;
    const due = Date.parse(meta.deletion_scheduled_for);
    if (!Number.isFinite(due) || due > now) continue;
    if (meta.role === "admin" || meta.role === "owner") continue;
    try {
      const requested = Date.parse(meta.deletion_requested_at);
      const lastSignIn = Date.parse(user.last_sign_in_at);
      if (Number.isFinite(requested) && Number.isFinite(lastSignIn) && lastSignIn > requested) {
        await admin.auth.admin.updateUserById(user.id, { app_metadata: withoutDeletion(meta) });
        summary.deletionsCancelled++;
        continue;
      }
      // Email first: once the account is gone, so is the address.
      if (user.email && mailConfigured()) {
        try {
          const mail = await composeEmail(admin, "accountDeleted", user, {}, SITE, cache);
          if (mail) await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
        } catch (err) {
          console.error(`reminders: deleted-account email to ${user.email} failed:`, err.message);
        }
      }
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw new Error(error.message);
      summary.accountsDeleted++;
    } catch (err) {
      summary.errors++;
      console.error(`reminders: deletion of ${user.email || user.id}:`, err.message);
    }
  }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = Date.now();
  const summary = { scanned: 0, expiringSent: 0, expiredSent: 0, accountsDeleted: 0, deletionsCancelled: 0, errors: 0 };

  try {
    const users = await listAllUsers();
    const cache = new Map(); // each email's saved settings, read once per run
    await processDeletions(users, now, summary, cache);
    for (const user of users) {
      const meta = user.app_metadata || {};
      if (meta.plan !== "Premium" || !meta.premium_until || !user.email) continue;
      // Deactivated, awaiting deletion: no "renew your pass" nudges.
      if (meta.deletion_scheduled_for) continue;
      if (meta.role === "admin" || meta.role === "owner") continue;

      const until = Date.parse(meta.premium_until);
      if (!Number.isFinite(until)) continue;
      summary.scanned++;
      const daysLeft = (until - now) / DAY_MS;

      try {
        // Expiring within 3 days (and not yet expired), once per premium_until.
        if (daysLeft > 0 && daysLeft <= 3 && meta.reminder_expiring_at !== meta.premium_until) {
          const d = Math.max(1, Math.round(daysLeft));
          const mail = await composeEmail(admin, "expiring", user, { forfait: planOf(meta), jours: `${d} ${d === 1 ? "jour" : "jours"}` }, SITE, cache);
          if (mail) {
            await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
            await patchMetadata(user, { reminder_expiring_at: meta.premium_until });
            summary.expiringSent++;
          }
        }
        // Recently expired, once per premium_until.
        else if (daysLeft <= 0 && daysLeft >= -3 && meta.reminder_expired_at !== meta.premium_until) {
          const mail = await composeEmail(admin, "expired", user, { forfait: planOf(meta) }, SITE, cache);
          if (mail) {
            await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
            await patchMetadata(user, { reminder_expired_at: meta.premium_until });
            summary.expiredSent++;
          }
        }
      } catch (err) {
        summary.errors++;
        console.error(`reminders: ${user.email}:`, err.message);
      }
    }
  } catch (err) {
    console.error("reminders: fatal:", err.message);
    return res.status(500).json({ error: err.message, summary });
  }

  return res.status(200).json({ ok: true, summary });
}
