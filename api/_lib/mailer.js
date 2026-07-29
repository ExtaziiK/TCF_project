import nodemailer from "nodemailer";
// Re-exported below for callers; also used locally by recipientVars(), which a
// bare `export … from` would not give us a binding for.
import { linkVars } from "./emailTemplates.js";

// Transactional email over the Hostinger mailbox (contact@tcfpasserelle.com).
// Server-side only: SMTP_USER / SMTP_PASS are the mailbox's own credentials and
// must never reach the browser. Files under api/_lib are ignored by Vercel's
// router (underscore prefix), so this is a shared module, not an endpoint.
//
// Hostinger SMTP: host smtp.hostinger.com, port 465 (implicit TLS). The FROM
// address must be a real mailbox on the domain or Hostinger rejects the send.

const SMTP_HOST = process.env.SMTP_HOST || "smtp.hostinger.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const FROM_NAME = process.env.MAIL_FROM_NAME || "Passerelle TCF";
// The address users see and can reply to. Defaults to the login mailbox.
const FROM_ADDR = process.env.MAIL_FROM_ADDR || process.env.SMTP_USER;

let cached = null;
function transport() {
  if (cached) return cached;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("Email is not configured (missing SMTP_USER / SMTP_PASS).");
  cached = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // 465 = implicit TLS; 587 would be STARTTLS
    auth: { user, pass },
  });
  return cached;
}

export async function sendMail({ to, subject, html, text }) {
  return transport().sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDR}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  });
}

/* ----------------------------- email templates ---------------------------- */
// The copy of each message is admin-editable and lives in
// api/_lib/emailTemplates.js (shipped defaults + rendering) and the
// public.email_templates table (the admin's saved version). This module only
// knows how to put an envelope on the wire.

export { renderTemplate, DEFAULTS, withDefaults, sampleVars } from "./emailTemplates.js";
export { linkVars };

// Loads every saved template, keyed by template key. Service-role only (RLS
// keeps the promo code away from clients). A missing table — the migration not
// applied yet — is not an error: callers merge over the shipped defaults, so
// reminders keep going out with the original wording.
export async function loadTemplates(admin) {
  try {
    const { data, error } = await admin.from("email_templates").select("*");
    if (error) throw new Error(error.message);
    return Object.fromEntries((data || []).map((row) => [row.key, row]));
  } catch (err) {
    console.warn("email templates: falling back to defaults:", err.message);
    return {};
  }
}

// The per-recipient values behind {{name}}, {{plan}}, {{days_left}}… The user's
// display name is escaped at render time, not here.
export function recipientVars(user, { daysLeft, until, site, promoCode }) {
  const days = Math.max(1, Math.round(Math.abs(daysLeft)));
  return {
    ...linkVars(site),
    name: user.user_metadata?.name || user.user_metadata?.full_name || "",
    plan: user.app_metadata?.plan_label || "Premium",
    days_left: String(days),
    days_word: days === 1 ? "jour" : "jours",
    expiry_date: until
      ? new Date(until).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })
      : "",
    promo_code: promoCode || "",
  };
}
