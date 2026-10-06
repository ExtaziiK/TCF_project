// The welcome email: its default wording, the shape of the editable copy, and
// the renderer. Pure (no Node or browser APIs) because two sides use it — the
// server that sends it (api/_lib/public/account.js, api/_lib/admin/welcomeEmail.js)
// and the admin "Emails" tab that previews it — and the preview must be exactly
// what goes out.
//
// The owner edits the text in Administration → Emails; it is stored as JSON in
// site_settings under WELCOME_EMAIL_KEY. That column is capped at 2000
// characters, hence WELCOME_MAX_CHARS. Text fields are plain text: blank lines
// separate paragraphs and **double asterisks** make bold. Everything else is
// escaped.

export const WELCOME_EMAIL_KEY = "welcome_email";
export const WELCOME_MAX_CHARS = 2000;
// Accounts created within this many days get it (automatically on their first
// sign-in, or from the admin's "send to recent signups" button).
export const WELCOME_WINDOW_DAYS = 7;

export const DEFAULT_WELCOME = {
  enabled: true,
  subject: "Bienvenue sur Passerelle TCF !",
  intro: "Bienvenue sur **Passerelle TCF** ! Votre compte est prêt : vous pouvez commencer votre préparation au TCF Canada dès maintenant.",
  stepsTitle: "Par où commencer ?",
  steps: [
    "Faites un premier quiz dans **Épreuves** pour situer votre niveau en compréhension orale et écrite.",
    "Passez votre **TCF blanc gratuit** : un examen complet et chronométré, comme le jour J.",
    "Essayez l'**expression écrite et orale** avec la correction par IA, sur un sujet d'essai.",
  ].join("\n"),
  promoCode: "TCF30",
  promoText: "Cadeau de bienvenue : **-30 %** sur votre premier forfait avec le code",
  buttonLabel: "Commencer ma préparation",
  outro: "Le vocabulaire, la grammaire et la conjugaison sont aussi en accès libre, depuis le menu **S'entraîner**.\n\nUne question ? Répondez simplement à ce courriel, nous vous répondrons.\n\nBonne préparation,",
};

const TEXT_FIELDS = ["subject", "intro", "stepsTitle", "steps", "promoCode", "promoText", "buttonLabel", "outro"];

// Whatever was stored (or sent by the admin form), coerced to the full shape.
// A missing field falls back to the default; an empty string is kept, which
// is how the owner hides a part (no promo code → no promo box).
export function normalizeWelcome(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = { enabled: src.enabled === undefined ? DEFAULT_WELCOME.enabled : src.enabled === true };
  for (const k of TEXT_FIELDS) out[k] = typeof src[k] === "string" ? src[k] : DEFAULT_WELCOME[k];
  out.promoCode = out.promoCode.trim().toUpperCase();
  return out;
}

export function parseWelcome(value) {
  try { return normalizeWelcome(value ? JSON.parse(value) : null); } catch { return normalizeWelcome(null); }
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// Escaped text → inline HTML: **bold**, single newlines kept, and French
// typography (no line break between a word and its ? ! : ; »).
const inline = (s) => escapeHtml(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/ ([?!:;»%])/g, "&nbsp;$1")
  .replace(/« /g, "«&nbsp;")
  .replace(/\n/g, "<br>");

const paragraphs = (s, last = "20px") => String(s).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  .map((p, i, all) => `<p style="margin:0 0 ${i === all.length - 1 ? last : "14px"} 0;">${inline(p)}</p>`).join("");

const FONT = "Segoe UI,Roboto,Helvetica,Arial,sans-serif";

const button = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px;">${inline(label)}</a>`;

// The look of the emails the team writes by hand from the Hostinger webmail
// (emails/*.html at the repo root): white card, centred logo, a signature with
// the logo mark. Tables and inline styles only, so Gmail and Outlook keep it.
function signedLetter(site, inner) {
  return `
<div style="margin:0;padding:24px;background:#e2e8f0;font-family:${FONT};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;">
  <tr><td style="padding:28px 32px 8px 32px;text-align:center;">
    <img src="${site}/logo-full.png" width="110" alt="Passerelle TCF Canada" style="display:inline-block;border:0;height:auto;">
  </td></tr>
  <tr><td style="padding:12px 32px 8px 32px;font-family:${FONT};font-size:15px;line-height:24px;color:#334155;">
    ${inner}
  </td></tr>
  <tr><td style="padding:8px 32px 28px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #2563eb;padding-top:14px;">
      <tr>
        <td style="padding:14px 14px 0 0;vertical-align:middle;">
          <img src="${site}/logo-mark.png" width="44" height="44" alt="Passerelle TCF" style="display:block;border:0;">
        </td>
        <td style="padding:14px 0 0 0;vertical-align:middle;font-family:${FONT};font-size:13px;line-height:20px;color:#64748b;">
          <strong style="font-size:15px;color:#0f172a;">L'équipe Passerelle TCF</strong><br>
          Préparation au TCF Canada<br>
          <a href="mailto:contact@tcfpasserelle.com" style="color:#2563eb;text-decoration:none;">contact@tcfpasserelle.com</a>
          &nbsp;·&nbsp;
          <a href="${site}" style="color:#2563eb;text-decoration:none;">www.tcfpasserelle.com</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</div>`;
}

// → { subject, html }. `firstName` may be empty ("Bonjour,").
export function renderWelcome(cfg, { firstName = "", site }) {
  const c = normalizeWelcome(cfg);
  const steps = c.steps.split("\n").map((s) => s.trim()).filter(Boolean);
  const stepsBox = steps.length ? `
    ${c.stepsTitle.trim() ? `<p style="margin:0 0 10px 0;"><strong>${inline(c.stepsTitle.trim())}</strong></p>` : ""}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <tr><td style="padding:14px 18px;font-family:${FONT};font-size:15px;line-height:26px;color:#334155;">
        ${steps.map((s, i) => `<strong style="color:#2563eb;">${i + 1}.</strong> ${inline(s)}`).join("<br>")}
      </td></tr>
    </table>` : "";
  const promoBox = c.promoCode ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;">
      <tr><td style="padding:16px 18px;text-align:center;font-family:${FONT};font-size:15px;line-height:24px;color:#334155;">
        ${c.promoText.trim() ? `${inline(c.promoText.trim())}<br>` : ""}
        <span style="display:inline-block;margin:8px 0 6px 0;padding:6px 16px;background:#ffffff;border-radius:8px;font-size:22px;font-weight:800;letter-spacing:2px;color:#1d4ed8;">${escapeHtml(c.promoCode)}</span><br>
        <span style="font-size:13px;color:#64748b;">À saisir dans le champ «&nbsp;Code promo&nbsp;» de la page <a href="${site}/tarifs" style="color:#2563eb;">Tarifs</a>.</span>
      </td></tr>
    </table>` : "";
  const first = String(firstName || "").trim();
  const html = signedLetter(site, `
    <p style="margin:0 0 14px 0;">${first ? `Bonjour ${escapeHtml(first)},` : "Bonjour,"}</p>
    ${paragraphs(c.intro, "14px")}
    ${stepsBox}
    ${promoBox}
    ${c.buttonLabel.trim() ? `<p style="margin:0 0 22px 0;text-align:center;">${button(`${site}/mes-examens`, c.buttonLabel.trim())}</p>` : ""}
    ${paragraphs(c.outro, "4px")}
  `);
  return { subject: c.subject.trim() || DEFAULT_WELCOME.subject, html };
}

// First name from the account, as the greeting uses it.
export const firstNameOf = (user) =>
  String(user?.user_metadata?.name || user?.user_metadata?.full_name || "").trim().split(/\s+/)[0] || "";
