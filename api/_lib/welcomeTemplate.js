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

import { FONT, inline, paragraphs, button, signedLetter, greetingLine, firstNameOf, promoBox, PROMO_GIFS, promoHelpUrl } from "./emailLayout.js";

export { firstNameOf, PROMO_GIFS, promoHelpUrl };

export const WELCOME_EMAIL_KEY = "welcome_email";
export const WELCOME_MAX_CHARS = 2000;
// Accounts created within this many days get it (automatically on their first
// sign-in, or from the admin's "send to recent signups" button).
export const WELCOME_WINDOW_DAYS = 7;

export const DEFAULT_WELCOME = {
  enabled: true,
  subject: "Bienvenue sur TCF Passerelle !",
  intro: "Bienvenue sur **TCF Passerelle** ! Votre compte est prêt : vous pouvez commencer votre préparation au TCF Canada dès maintenant.",
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
  const promo = promoBox(site, c.promoCode, c.promoText);
  const html = signedLetter(site, `
    ${greetingLine(firstName)}
    ${paragraphs(c.intro, { last: "14px" })}
    ${stepsBox}
    ${promo}
    ${c.buttonLabel.trim() ? `<p style="margin:0 0 22px 0;text-align:center;">${button(`${site}/mes-examens`, c.buttonLabel.trim())}</p>` : ""}
    ${paragraphs(c.outro, { last: "4px" })}
  `);
  return { subject: c.subject.trim() || DEFAULT_WELCOME.subject, html };
}
