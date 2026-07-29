// Transactional email templates, editable from Admin › Emails.
//
// The wording is written as plain text — a blank line between paragraphs,
// **gras** for emphasis, and a few [blocs] for the graphical pieces — and is
// converted to the branded HTML here, at send time. That split is deliberate:
// whoever edits the copy is editing words, not markup, so a stray tag can
// never reach a customer's inbox, and the design stays consistent because it
// lives in this file rather than in the text.
//
// Rows live in public.email_templates (admin-only RLS; the cron reads them with
// the service role). DEFAULTS below is what ships, what "Réinitialiser"
// restores, and the fallback whenever the table is missing, empty or
// unreachable — so an absent or broken row can never stop a reminder going out.

const BRAND = "Passerelle TCF";

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

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

const button = (href, label, color) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px;">${label}</a>`;

const promoBox = (intro, code) => `<div style="margin:0 0 22px;padding:14px 18px;border:1px dashed #2563eb;border-radius:12px;background:#f5f8ff;">
    <p style="margin:0 0 4px;font-size:14px;">${intro}</p>
    <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:1px;color:#2563eb;">${code}</p>
    <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">À saisir au moment du paiement.</p>
  </div>`;

/* ------------------------- the [blocs] an admin can use ------------------- */

// Accents are optional in the tag ([bouton témoignage] == [bouton temoignage]),
// because asking someone to remember which spelling the parser wants is exactly
// the kind of trap this format exists to avoid.
const deaccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const BUTTONS = {
  renouveler: { label: "Renouveler mon accès", url: "renew_url", color: "#2563eb" },
  temoignage: { label: "Partager mon témoignage", url: "feedback_url", color: "#7c3aed" },
};

/* -------------------------------- rendering ------------------------------- */

// Inline formatting for one paragraph. The admin's text is escaped first, so a
// typed "<" shows as "<"; variable values are escaped as they go in (a signup
// name could otherwise inject markup); **gras** is applied last, on text that
// is already safe.
function inline(text, vars) {
  return escapeHtml(text)
    .replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? ""))
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

function blockToHtml(block, vars) {
  // [promo] / [promo: phrase d'introduction] — renders nothing at all when no
  // code is attached, so removing the code never leaves a dangling sentence.
  const promo = block.match(/^\[promo(?::\s*([\s\S]*?))?\]$/i);
  if (promo) {
    if (!vars.promo_code) return "";
    return promoBox(inline(promo[1] || "Voici votre code de réduction :", vars), escapeHtml(vars.promo_code));
  }

  // [bouton renouveler] / [bouton renouveler: Texte personnalisé]
  const btn = block.match(/^\[bouton\s+([^\]:]+?)(?::\s*([\s\S]*?))?\]$/i);
  if (btn) {
    const spec = BUTTONS[deaccent(btn[1].trim()).toLowerCase()];
    if (!spec) return ""; // unknown name; refused at save time by validate()
    return `<p style="margin:0 0 22px;">${button(vars[spec.url], btn[2] ? inline(btn[2], vars) : spec.label, spec.color)}</p>`;
  }

  // [note] … — the small grey line (disclaimers, "ignorez ce message", thanks).
  const note = block.match(/^\[note\]\s*([\s\S]*)$/i);
  if (note) return `<p style="margin:0 0 16px;color:#6b7280;font-size:13px;">${inline(note[1], vars)}</p>`;

  return `<p style="margin:0 0 16px;">${inline(block, vars)}</p>`;
}

// Plain-text body → the HTML that goes inside the shell. Blocks are separated
// by blank lines; a single newline inside one is a line break.
export function textToHtml(text, vars) {
  const blocks = String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => blockToHtml(b, vars))
    .filter(Boolean);
  // The last visible block sits flush against the padding — no trailing gap.
  if (blocks.length) blocks[blocks.length - 1] = blocks[blocks.length - 1].replace(/margin:0 0 \d+px;/, "margin:0;");
  return blocks.join("\n  ");
}

// Subjects are plain text end to end: no escaping (an "&" must stay an "&" in
// an inbox), no markup.
function fillSubject(text, vars) {
  return String(text || "").replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}

// Templates saved before the plain-text editor stored a raw HTML fragment.
// They keep rendering the old way — {{var}} substitution plus {{#section}}…
// — so a customer never receives a message with tags printed as text.
const LEGACY_HTML_VARS = new Set(["renew_button", "feedback_button"]);
const looksLikeHtml = (body) => /<\s*(p|div|a|strong|br|span|table)\b/i.test(body);

function fillLegacyHtml(text, vars) {
  const withSections = String(text || "").replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, inner) => (vars[key] ? inner : ""),
  );
  return withSections.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    if (value == null) return "";
    return LEGACY_HTML_VARS.has(key) ? String(value) : escapeHtml(value);
  });
}

// A stored (or default) template + one recipient's values → the exact subject
// and full HTML document handed to the mailer.
export function renderTemplate(template, vars) {
  const body = String(template.body || "");
  return {
    subject: fillSubject(template.subject, vars),
    html: shell(looksLikeHtml(body) ? fillLegacyHtml(body, vars) : textToHtml(body, vars)),
  };
}

/* ------------------------------- variables -------------------------------- */

// What a template may reference, with the label the admin panel shows on each
// chip. `sample` drives the preview and the test send, so the editor sees a
// realistic message without touching a real account.
export const TEMPLATE_VARS = [
  { name: "salutation", label: "Salutation complète — « Bonjour Amira, », ou « Bonjour, » si le prénom est inconnu", sample: "Bonjour Amira," },
  { name: "name", label: "Prénom du client seul (vide s'il est inconnu)", sample: "Amira" },
  { name: "plan", label: "Nom du forfait", sample: "Premium" },
  { name: "days_left", label: "Temps restant, accordé — « 3 jours », « 1 jour »", sample: "3 jours" },
  { name: "expiry_date", label: "Date de fin de l'abonnement", sample: "12 août 2026" },
  { name: "promo_code", label: "Le code de réduction choisi plus bas", sample: "" },
];

// The graphical blocks, offered as one-click inserts next to the variables.
export const TEMPLATE_BLOCKS = [
  { insert: "[bouton renouveler]", label: "Bouton bleu « Renouveler mon accès » (vers la page Tarifs)" },
  { insert: "[bouton temoignage]", label: "Bouton violet « Partager mon témoignage » (vers le profil)" },
  { insert: "[promo: Voici votre code :]", label: "Encadré du code de réduction — disparaît si aucun code n'est choisi" },
  { insert: "[note] ", label: "Ligne en petits caractères gris" },
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
    // Only legacy HTML templates reference these directly.
    renew_button: button(renewUrl, "Renouveler mon accès", "#2563eb"),
    feedback_button: button(feedbackUrl, "Partager mon témoignage", "#7c3aed"),
  };
}

export function sampleVars(site) {
  const vars = { ...linkVars(site) };
  for (const v of TEMPLATE_VARS) if (v.sample) vars[v.name] = v.sample;
  return vars;
}

/* -------------------------------- defaults -------------------------------- */

export const DEFAULTS = {
  expiring_soon: {
    subject: "Votre accès {{plan}} expire dans {{days_left}}",
    body: `{{salutation}}

Petit rappel amical : votre abonnement **{{plan}}** arrive à échéance dans **{{days_left}}**, le {{expiry_date}}.

Pour continuer sans interruption vos quiz, simulations IA et TCF blancs, renouvelez dès maintenant :

[bouton renouveler]

[promo: Pour vous remercier de votre fidélité, voici votre code :]

[note] Si vous avez déjà renouvelé, ignorez ce message — merci !`,
  },
  expired: {
    subject: "Votre accès {{plan}} a expiré",
    body: `{{salutation}}

Votre abonnement **{{plan}}** a pris fin le {{expiry_date}}. Votre compte reste ouvert : votre progression et votre historique sont conservés.

Comment s'est passée votre préparation ? Votre témoignage aide les prochains candidats — après validation, il apparaîtra sur notre page d'accueil.

[bouton temoignage]

[promo: Envie de reprendre ? Ce code vous est réservé :]

[bouton renouveler]

[note] Merci d'avoir préparé votre TCF avec nous. À très bientôt !`,
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
