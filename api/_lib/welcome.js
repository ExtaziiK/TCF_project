import { sendMail, mailConfigured } from "./mailer.js";
import { WELCOME_EMAIL_KEY, WELCOME_WINDOW_DAYS, parseWelcome, renderWelcome, firstNameOf } from "./welcomeTemplate.js";

// Sending the welcome email, shared by the automatic send on a new account's
// first sign-in (api/_lib/public/account.js) and the admin's "send to recent
// signups" button (api/_lib/admin/welcomeEmail.js). The one rule both obey:
// an account gets it at most once, recorded as app_metadata.welcome_email_sent_at.

const DAY_MS = 24 * 60 * 60 * 1000;

export const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.tcfpasserelle.com").replace(/\/$/, "");

// The owner's saved copy (Administration → Emails), or the defaults.
export async function loadWelcomeConfig(admin) {
  const { data } = await admin.from("site_settings").select("value").eq("key", WELCOME_EMAIL_KEY).maybeSingle();
  return parseWelcome(data?.value);
}

// Why an account would NOT get it, or null if it should.
export function welcomeSkipReason(user) {
  const meta = user.app_metadata || {};
  if (meta.welcome_email_sent_at) return "already";
  if (!user.email || !(user.email_confirmed_at || user.confirmed_at)) return "unconfirmed";
  if (meta.deletion_scheduled_for) return "deleting";
  if (Date.now() - Date.parse(user.created_at) > WELCOME_WINDOW_DAYS * DAY_MS) return "old";
  return null;
}

// Stamps the account BEFORE sending, so two tabs (or the button and a sign-in)
// cannot both send it; a failed send clears the stamp so it can be retried.
// Throws on failure. `user` must be the live record (getUser / getUserById).
export async function sendWelcome(admin, user, cfg) {
  if (!mailConfigured()) throw new Error("Email non configuré (SMTP).");
  const meta = user.app_metadata || {};
  const stamp = (v) => admin.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, welcome_email_sent_at: v } });
  const { error } = await stamp(new Date().toISOString());
  if (error) throw new Error(error.message);
  try {
    const { subject, html } = renderWelcome(cfg, { firstName: firstNameOf(user), site: SITE });
    await sendMail({ to: user.email, subject, html });
  } catch (err) {
    await stamp(null);
    throw err;
  }
}
