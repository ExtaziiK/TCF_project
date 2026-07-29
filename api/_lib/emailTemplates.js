// Transactional email templates, editable from Admin › Emails.
//
// The branded shell (header, footer, button styling) stays in code so every
// message keeps the same identity; an admin edits the *copy* — the subject and
// the body fragment that sits inside the shell. Saved rows live in
// public.email_templates (admin-only RLS; the cron reads them with the service
// role). DEFAULTS below is what ships, what "Réinitialiser" restores, and the
// fallback whenever the table is missing, empty or unreachable — so an absent
// or broken row can never stop a reminder going out.
//
// Placeholders are {{name}}-style, and {{#promo_code}}…{{/promo_code}} marks a
// section that renders only when that variable is non-empty. That is how the
// discount paragraph disappears by itself when no code is attached, instead of
// leaving a dangling "utilisez le code" sentence.

const BRAND = "Passerelle TCF";

// Values that are pre-built markup rather than text, so they are inserted raw.
// Everything else is HTML-escaped: `name` comes from user metadata and would
// otherwise let a signup name inject markup into the message.
const HTML_VARS = new Set(["renew_button", "feedback_button"]);

export const shell = (inner) => `
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

const button = (href, label, color = "#2563eb") =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px;">${label}</a>`;

/* ------------------------------- rendering -------------------------------- */

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

// Conditional sections first, then the placeholders left inside them.
function sections(text, vars) {
  return text.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => (vars[key] ? inner : ""));
}

function fill(text, vars, { html }) {
  return sections(String(text || ""), vars).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    if (value == null) return "";
    return html && !HTML_VARS.has(key) ? escapeHtml(value) : String(value);
  });
}

// A stored (or default) template + the variables for one recipient → the exact
// subject and full HTML document handed to the mailer.
export function renderTemplate(template, vars) {
  return {
    subject: fill(template.subject, vars, { html: false }),
    html: shell(fill(template.body, vars, { html: true })),
  };
}

/* ------------------------------- variables -------------------------------- */

// Everything a template may reference. `sample` drives the admin preview and
// the test send, so the editor sees a realistic message without touching a real
// account. Exposed through the API so the admin UI never hardcodes this list.
export const TEMPLATE_VARS = [
  { name: "name", label: "Prénom du client (vide si inconnu)", sample: "Amira" },
  { name: "plan", label: "Nom du forfait", sample: "Premium" },
  { name: "days_left", label: "Jours restants avant expiration", sample: "3" },
  { name: "days_word", label: "« jour » ou « jours » selon le nombre", sample: "jours" },
  { name: "expiry_date", label: "Date de fin d'abonnement", sample: "12 août 2026" },
  { name: "promo_code", label: "Code de réduction attaché au modèle", sample: "RETOUR20" },
  { name: "renew_button", label: "Bouton « Renouveler mon accès »", sample: "" },
  { name: "feedback_button", label: "Bouton « Partager mon témoignage »", sample: "" },
  { name: "renew_url", label: "Lien vers la page Tarifs", sample: "" },
  { name: "feedback_url", label: "Lien vers le formulaire de témoignage", sample: "" },
  { name: "site_url", label: "Adresse du site", sample: "" },
];

// The links every template gets. The renew CTA points at /tarifs — the real
// path of the pricing page (see src/constants/seo.js); it used to say /pricing,
// which is not a route and now lands on the 404 page.
export function linkVars(site) {
  const renewUrl = `${site}/tarifs`;
  // The testimonial form lives on the member's profile page.
  const feedbackUrl = `${site}/profil`;
  return {
    site_url: site,
    renew_url: renewUrl,
    feedback_url: feedbackUrl,
    renew_button: button(renewUrl, "Renouveler mon accès"),
    feedback_button: button(feedbackUrl, "Partager mon témoignage", "#7c3aed"),
  };
}

export function sampleVars(site) {
  const vars = { ...linkVars(site) };
  for (const v of TEMPLATE_VARS) if (v.sample) vars[v.name] = v.sample;
  return vars;
}

/* -------------------------------- defaults -------------------------------- */

const PROMO_BLOCK = (intro) => `
  {{#promo_code}}<div style="margin:0 0 22px;padding:14px 18px;border:1px dashed #2563eb;border-radius:12px;background:#f5f8ff;">
    <p style="margin:0 0 4px;font-size:14px;">${intro}</p>
    <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:1px;color:#2563eb;">{{promo_code}}</p>
    <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">À saisir au moment du paiement.</p>
  </div>{{/promo_code}}`;

export const DEFAULTS = {
  expiring_soon: {
    subject: "Votre accès {{plan}} expire dans {{days_left}} {{days_word}}",
    body: `
  <p style="margin:0 0 14px;">Bonjour{{#name}} {{name}}{{/name}},</p>
  <p style="margin:0 0 14px;">Petit rappel amical&nbsp;: votre abonnement <strong>{{plan}}</strong>
    arrive à échéance dans <strong>{{days_left}} {{days_word}}</strong>, le {{expiry_date}}.</p>
  <p style="margin:0 0 20px;">Pour continuer sans interruption vos quiz, simulations IA et TCF blancs,
    renouvelez dès maintenant&nbsp;:</p>
  <p style="margin:0 0 22px;">{{renew_button}}</p>
${PROMO_BLOCK("Pour vous remercier de votre fidélité, voici votre code&nbsp;:")}
  <p style="margin:0;color:#6b7280;font-size:13px;">Si vous avez déjà renouvelé, ignorez ce message&nbsp;— merci&nbsp;!</p>`,
  },
  expired: {
    subject: "Votre accès {{plan}} a expiré",
    body: `
  <p style="margin:0 0 14px;">Bonjour{{#name}} {{name}}{{/name}},</p>
  <p style="margin:0 0 14px;">Votre abonnement <strong>{{plan}}</strong> a pris fin le {{expiry_date}}.
    Votre compte reste ouvert&nbsp;: votre progression et votre historique sont conservés.</p>
  <p style="margin:0 0 20px;">Comment s'est passée votre préparation&nbsp;? Votre témoignage aide les
    prochains candidats — après validation, il apparaîtra sur notre page d'accueil.</p>
  <p style="margin:0 0 22px;">{{feedback_button}}</p>
${PROMO_BLOCK("Envie de reprendre&nbsp;? Ce code vous est réservé&nbsp;:")}
  <p style="margin:0 0 22px;">{{renew_button}}</p>
  <p style="margin:0;color:#6b7280;font-size:13px;">Merci d'avoir préparé votre TCF avec nous. À très bientôt&nbsp;!</p>`,
  },
};

// Editor metadata: what each template is and when it goes out. Shown in the
// admin panel so the copy is never edited blind.
export const TEMPLATE_META = [
  {
    key: "expiring_soon",
    label: "Avant expiration",
    description: "Rappel de renouvellement envoyé avant la fin de l'abonnement.",
    when: "Chaque jour à 8 h, aux comptes dont l'accès expire dans 3 jours ou moins. Envoyé une seule fois par échéance.",
  },
  {
    key: "expired",
    label: "Après expiration",
    description: "Demande de témoignage et invitation à renouveler, une fois l'accès terminé.",
    when: "Chaque jour à 8 h, aux comptes expirés depuis 3 jours ou moins. Envoyé une seule fois par échéance.",
  },
];

// A stored row merged over its default: a template the admin has never saved
// still renders, and a row missing a field falls back rather than sending blank.
export function withDefaults(key, row) {
  const base = DEFAULTS[key];
  if (!base) return null;
  return {
    key,
    subject: row?.subject || base.subject,
    body: row?.body || base.body,
    enabled: row?.enabled ?? true,
    promoCode: row?.promo_code || "",
    updatedAt: row?.updated_at || null,
    customized: !!row,
  };
}
