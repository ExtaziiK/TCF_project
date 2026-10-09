import nodemailer from "nodemailer";
import { escapeHtml, button, signedLetter } from "./emailLayout.js";

const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.tcfpasserelle.com").replace(/\/$/, "");

// Transactional email over the Hostinger mailbox (contact@tcfpasserelle.com).
// Server-side only: SMTP_USER / SMTP_PASS are the mailbox's own credentials and
// must never reach the browser. Files under api/_lib are ignored by Vercel's
// router (underscore prefix), so this is a shared module, not an endpoint.
//
// Hostinger SMTP: host smtp.hostinger.com, port 465 (implicit TLS). The FROM
// address must be a real mailbox on the domain or Hostinger rejects the send.

const SMTP_HOST = process.env.SMTP_HOST || "smtp.hostinger.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const FROM_NAME = process.env.MAIL_FROM_NAME || "TCF Passerelle";
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

// `replyTo`: where "Reply" goes — the candidate, on an email the site sends
// to the team on their behalf (the support request).
export async function sendMail({ to, cc, replyTo, subject, html, text }) {
  return transport().sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDR}>`,
    to,
    ...(cc && cc.length ? { cc } : {}),
    ...(replyTo ? { replyTo } : {}),
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  });
}

// Whether SMTP credentials are present. Lets a caller offer (or withhold) the
// email option honestly instead of finding out at send time.
// The team's own mailbox — where a support request is delivered.
export const TEAM_ADDRESS = FROM_ADDR;

export function mailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/* ------------------------------ support reply ----------------------------- */
// The automatic account emails are editable from Administration → Emails and
// live in emailTemplates.js / welcomeTemplate.js. The support reply is not a
// template — its text is written by the admin for each message — so only its
// frame is here, the same signed letter as every other email.

// The team's answer to a contact message. Quotes the original underneath so the
// reply makes sense on its own, days later, in a crowded inbox.
export function supportReplyEmail({ name, subject, body, original, site }) {
  const title = subject ? `Re: ${subject}` : "Réponse à votre message";
  const paragraphs = escapeHtml(body).split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${p.replace(/\n/g, "<br/>")}</p>`).join("");
  const quoted = original
    ? `<div style="margin:22px 0 0;padding:14px 16px;background:#f6f7fb;border-left:3px solid #d6d9e4;border-radius:8px;color:#6b7280;font-size:13px;line-height:1.6;">
         <div style="font-weight:600;margin-bottom:6px;">Votre message${subject ? ` — ${escapeHtml(subject)}` : ""}</div>
         ${escapeHtml(original).replace(/\n/g, "<br/>")}
       </div>`
    : "";
  const html = signedLetter(SITE, `
    <p style="margin:0 0 14px;">${name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,"}</p>
    ${paragraphs}
    ${site ? `<p style="margin:22px 0;text-align:center;">${button(`${site}/profil`, "Voir la conversation sur mon compte")}</p>` : ""}
    ${quoted}
  `);
  return { subject: title, html };
}
