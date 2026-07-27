import nodemailer from "nodemailer";

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
// Kept inline (no external assets) so they render in every client. French to
// match the app. `site` is the app URL used for the renew button.

const BRAND = "Passerelle TCF";
const wrap = (inner) => `
<div style="margin:0;padding:24px;background:#0b1020;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e8f0;">
    <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:24px 28px;">
      <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:.2px;">${BRAND}</div>
    </div>
    <div style="padding:28px;color:#1f2430;font-size:15px;line-height:1.6;">
      ${inner}
    </div>
    <div style="padding:18px 28px;background:#f6f7fb;color:#6b7280;font-size:12px;line-height:1.5;">
      Vous recevez cet email car vous avez un compte sur ${BRAND}.<br/>
      Une question&nbsp;? Répondez directement à ce message.
    </div>
  </div>
</div>`;

const button = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px;">${label}</a>`;

function greeting(user) {
  const name = user.user_metadata?.name || user.user_metadata?.full_name || "";
  return name ? `Bonjour ${name},` : "Bonjour,";
}

// 3-days-before reminder.
export function expiringSoonEmail(user, daysLeft, site) {
  const plan = user.app_metadata?.plan_label || "Premium";
  const d = Math.max(1, Math.round(daysLeft));
  const dayWord = d === 1 ? "jour" : "jours";
  const subject = `Votre accès ${plan} expire dans ${d} ${dayWord}`;
  const html = wrap(`
    <p style="margin:0 0 14px;">${greeting(user)}</p>
    <p style="margin:0 0 14px;">Petit rappel amical&nbsp;: votre abonnement <strong>${plan}</strong>
      arrive à échéance dans <strong>${d} ${dayWord}</strong>.</p>
    <p style="margin:0 0 20px;">Pour continuer sans interruption vos quiz, simulations IA et TCF blancs,
      renouvelez dès maintenant&nbsp;:</p>
    <p style="margin:0 0 22px;">${button(`${site}/pricing`, "Renouveler mon accès")}</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Si vous avez déjà renouvelé, ignorez ce message&nbsp;— merci&nbsp;!</p>
  `);
  return { subject, html };
}

// Sent once, just after expiry.
export function expiredEmail(user, site) {
  const plan = user.app_metadata?.plan_label || "Premium";
  const subject = `Votre accès ${plan} a expiré`;
  const html = wrap(`
    <p style="margin:0 0 14px;">${greeting(user)}</p>
    <p style="margin:0 0 14px;">Votre abonnement <strong>${plan}</strong> vient d'expirer.
      Votre compte est toujours là&nbsp;: votre progression et votre historique sont conservés.</p>
    <p style="margin:0 0 20px;">Envie de reprendre votre préparation au TCF&nbsp;? Réactivez votre accès en un clic&nbsp;:</p>
    <p style="margin:0 0 22px;">${button(`${site}/pricing`, "Renouveler mon accès")}</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Merci d'avoir préparé votre TCF avec nous. À très bientôt&nbsp;!</p>
  `);
  return { subject, html };
}
