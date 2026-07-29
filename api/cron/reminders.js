import { createClient } from "@supabase/supabase-js";
import { sendMail, loadTemplates, recipientVars } from "../_lib/mailer.js";
import { renderTemplate, withDefaults } from "../_lib/emailTemplates.js";

// Daily cron (see vercel.json → crons). Scans every account's Premium expiry
// (app_metadata.premium_until, the same field the admin API and rbac read) and
// sends two one-off emails:
//   • "expiring soon"  when 0 < daysLeft <= 3
//   • "expired"        when -3 <= daysLeft <= 0  (only recently expired, so old
//                      accounts aren't spammed the first time this ever runs)
//
// The wording of both is admin-editable (Admin › Emails → public.email_templates);
// api/_lib/emailTemplates.js holds the shipped defaults used whenever a template
// has never been saved, so this job never depends on a row existing.
//
// De-duplication lives on the account itself: reminder_expiring_at /
// reminder_expired_at store the premium_until value they were sent for. A
// renewal changes premium_until, which re-arms both reminders automatically —
// no extra table, no RLS to reason about. Metadata is merged, never replaced,
// so plan/role/stripe fields survive (same rule as the Stripe webhook).
//
// Security: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the env
// var is set. We reject anything else so the endpoint can't be triggered by the
// public. Set CRON_SECRET in the Vercel project (and .env.local for local runs).

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://tcfpasserelle.com").replace(/\/$/, "");

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

async function patchMetadata(user, patch) {
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, ...patch },
  });
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = Date.now();
  const summary = { scanned: 0, expiringSent: 0, expiredSent: 0, skipped: 0, errors: 0 };

  try {
    // The admin's saved copy for each email, merged over the shipped defaults.
    // Read once for the whole run — this is the same handful of rows for every
    // account. A template switched off in the admin panel is skipped entirely;
    // its reminder stays un-armed, so switching it back on resumes without a
    // gap for accounts that expired meanwhile.
    const saved = await loadTemplates(admin);
    const templates = {
      expiring_soon: withDefaults("expiring_soon", saved.expiring_soon),
      expired: withDefaults("expired", saved.expired),
    };

    const send = async (key, user, vars) => {
      const template = templates[key];
      if (!template.enabled) return false;
      const { subject, html } = renderTemplate(template, { ...vars, promo_code: template.promoCode });
      await sendMail({ to: user.email, subject, html });
      return true;
    };

    const users = await listAllUsers();
    for (const user of users) {
      const meta = user.app_metadata || {};
      if (meta.plan !== "Premium" || !meta.premium_until || !user.email) continue;
      if (meta.role === "admin" || meta.role === "owner") continue;

      const until = Date.parse(meta.premium_until);
      if (!Number.isFinite(until)) continue;
      summary.scanned++;
      const daysLeft = (until - now) / DAY_MS;

      try {
        const vars = recipientVars(user, { daysLeft, until, site: SITE });

        // Expiring within 3 days (and not yet expired), once per premium_until.
        if (daysLeft > 0 && daysLeft <= 3 && meta.reminder_expiring_at !== meta.premium_until) {
          if (await send("expiring_soon", user, vars)) {
            await patchMetadata(user, { reminder_expiring_at: meta.premium_until });
            summary.expiringSent++;
          } else summary.skipped++;
        }
        // Recently expired, once per premium_until.
        else if (daysLeft <= 0 && daysLeft >= -3 && meta.reminder_expired_at !== meta.premium_until) {
          if (await send("expired", user, vars)) {
            await patchMetadata(user, { reminder_expired_at: meta.premium_until });
            summary.expiredSent++;
          } else summary.skipped++;
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
