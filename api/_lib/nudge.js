import { sendMail, mailConfigured } from "./mailer.js";
import { composeEmail } from "./emails.js";

// "Votre TCF blanc gratuit vous attend" (EMAIL_TEMPLATES.inactiveNudge): sent
// once, by the daily cron (api/cron/reminders.js), to an account that signed
// up NUDGE_AFTER_DAYS ago and has done nothing since — no answer to a question,
// no TCF blanc started, no AI correction (the same three activity tables the
// -50 % offer reads). Premium and staff accounts are left alone.
//
// The window runs to NUDGE_UNTIL_DAYS so a day the cron did not run is caught
// up the next day, without ever reaching back to old accounts.
// Once per account: app_metadata.nudge_email_sent_at, stamped before sending,
// cleared if the send fails. Switched off in the admin tab → nothing stamped.

export const NUDGE_AFTER_DAYS = 3;
const NUDGE_UNTIL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const STAMP = "nudge_email_sent_at";

const premiumActive = (m) => m.plan === "Premium" && (!m.premium_until || Date.parse(m.premium_until) > Date.now());

export function nudgeCandidates(users, now) {
  return users.filter((u) => {
    const m = u.app_metadata || {};
    const age = now - Date.parse(u.created_at);
    return u.email && (u.email_confirmed_at || u.confirmed_at)
      && age >= NUDGE_AFTER_DAYS * DAY_MS && age < NUDGE_UNTIL_DAYS * DAY_MS
      && !m[STAMP] && !m.deletion_scheduled_for && !premiumActive(m)
      && !["admin", "owner", "moderator"].includes(m.role);
  });
}

// The candidates who have any activity at all — only their ids are queried.
async function activeAmong(admin, ids) {
  const active = new Set();
  for (const [table] of [["question_attempts"], ["exam_attempts"], ["ai_usage_log"]]) {
    const { data, error } = await admin.from(table).select("user_id").in("user_id", ids).limit(5000);
    if (error) throw new Error(`${table}: ${error.message}`); // unsure → send nothing today
    for (const r of data || []) active.add(r.user_id);
  }
  return active;
}

export async function processNudges(admin, users, now, summary, cache, site) {
  if (!mailConfigured()) return;
  const candidates = nudgeCandidates(users, now);
  if (!candidates.length) return;
  const active = await activeAmong(admin, candidates.map((u) => u.id));
  for (const user of candidates) {
    if (active.has(user.id)) continue;
    try {
      const mail = await composeEmail(admin, "inactiveNudge", user, {}, site, cache);
      if (!mail) return; // switched off: nobody today, nothing stamped
      const meta = user.app_metadata || {};
      const stamp = (v) => admin.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, [STAMP]: v } });
      await stamp(new Date(now).toISOString());
      try {
        await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
        summary.nudgesSent++;
      } catch (err) {
        await stamp(null);
        throw err;
      }
    } catch (err) {
      summary.errors++;
      console.error(`reminders: nudge to ${user.email}:`, err.message);
    }
  }
}
