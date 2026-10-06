import { paragraphs, signedLetter, greetingLine } from "./emailLayout.js";

// The automatic account emails other than the welcome email (which has its own
// richer form, see welcomeTemplate.js). Each is editable from Administration →
// Emails: an on/off switch, a subject and one body. Stored as JSON in
// site_settings under its `key` (2000 characters max, the column's cap).
//
// Body syntax, shown in the editor too:
//   - a blank line separates paragraphs; **double asterisks** make bold;
//   - {placeholders} are filled when sending (the ones each email lists);
//   - a paragraph that is only [Text](target) becomes a button, the target
//     being one of LINK_TARGETS.
//
// Pure (no Node or browser APIs): shared by the senders and the preview.

export const EMAIL_MAX_CHARS = 2000;

export const LINK_TARGETS = {
  tarifs: "/tarifs",
  profil: "/profil",
  connexion: "/connexion",
  epreuves: "/mes-examens",
  accueil: "/",
};

export const EMAIL_TEMPLATES = {
  expiring: {
    key: "email_expiring",
    title: "Rappel avant expiration",
    when: "Envoyé une fois, 3 jours (ou moins) avant la fin d'un accès Premium.",
    placeholders: { forfait: "Pro", jours: "3 jours" },
    defaults: {
      subject: "Votre accès {forfait} expire dans {jours}",
      body: "Petit rappel amical : votre abonnement **{forfait}** arrive à échéance dans **{jours}**.\n\nPour continuer sans interruption vos quiz, simulations IA et TCF blancs, renouvelez dès maintenant :\n\n[Renouveler mon accès](tarifs)\n\nSi vous avez déjà renouvelé, ignorez ce message — merci !\n\nBonne préparation,",
    },
  },
  expired: {
    key: "email_expired",
    title: "Accès expiré",
    when: "Envoyé une fois, dans les 3 jours qui suivent la fin d'un accès Premium.",
    placeholders: { forfait: "Pro" },
    defaults: {
      subject: "Votre accès {forfait} a expiré",
      body: "Votre abonnement **{forfait}** vient d'expirer. Votre compte est toujours là : votre progression et votre historique sont conservés.\n\nComment s'est passée votre préparation ? Votre témoignage aide les prochains candidats — après validation, il apparaîtra sur notre page d'accueil.\n\n[Partager mon témoignage](profil)\n\nEnvie de reprendre votre préparation au TCF ? Réactivez votre accès en un clic :\n\n[Renouveler mon accès](tarifs)\n\nMerci d'avoir préparé votre TCF avec nous. À très bientôt !",
    },
  },
  deletionScheduled: {
    key: "email_deletion_scheduled",
    title: "Compte désactivé (suppression demandée)",
    when: "Envoyé quand un membre demande la suppression de son compte depuis son profil. Recommandé : laisser activé.",
    placeholders: { date: "12 octobre 2026" },
    defaults: {
      subject: "Votre compte a été désactivé",
      body: "Nous avons bien reçu votre demande de suppression. Votre compte **TCF Passerelle** est désactivé et vous avez été déconnecté·e de tous vos appareils.\n\nVotre compte et toutes ses données (progression, résultats, historique) seront **définitivement supprimés le {date}**.\n\nVous avez changé d'avis ? Il suffit de vous reconnecter avant cette date : la suppression sera annulée et vous retrouverez tout comme avant.\n\n[Me reconnecter](connexion)\n\nSi vous n'êtes pas à l'origine de cette demande, reconnectez-vous et changez votre mot de passe, puis répondez à ce message.",
    },
  },
  accountDeleted: {
    key: "email_account_deleted",
    title: "Compte supprimé",
    when: "Envoyé juste avant l'effacement définitif d'un compte, 7 jours après la demande. Recommandé : laisser activé.",
    placeholders: {},
    defaults: {
      subject: "Votre compte a été supprimé",
      body: "Comme vous l'avez demandé, votre compte **TCF Passerelle** et toutes les données qui y étaient associées ont été définitivement supprimés.\n\nVous pouvez recréer un compte à tout moment avec la même adresse courriel, mais votre ancienne progression ne pourra pas être récupérée.\n\nMerci d'avoir préparé votre TCF avec nous, et bonne chance pour la suite !",
    },
  },
};

export function normalizeEmail(id, raw) {
  const t = EMAIL_TEMPLATES[id];
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: src.enabled === undefined ? true : src.enabled === true,
    subject: typeof src.subject === "string" ? src.subject : t.defaults.subject,
    body: typeof src.body === "string" ? src.body : t.defaults.body,
  };
}

export function parseEmail(id, value) {
  try { return normalizeEmail(id, value ? JSON.parse(value) : null); } catch { return normalizeEmail(id, null); }
}

// {name} → value, for the names this email declares; anything else is left
// as typed so a typo shows up in the preview instead of vanishing.
const fill = (text, vars) => String(text).replace(/\{([a-z]+)\}/gi, (m, k) => (k in vars ? String(vars[k]) : m));

// → { subject, html }. `vars` defaults to the template's sample values, which
// is what the preview and a test send use.
export function renderEmail(id, cfg, { firstName = "", vars, site }) {
  const t = EMAIL_TEMPLATES[id];
  const c = normalizeEmail(id, cfg);
  const v = { ...t.placeholders, ...(vars || {}) };
  const links = Object.fromEntries(Object.entries(LINK_TARGETS).map(([k, path]) => [k, `${site}${path}`]));
  const html = signedLetter(site, `
    ${greetingLine(firstName)}
    ${paragraphs(fill(c.body, v), { last: "4px", links })}
  `);
  return { subject: fill(c.subject.trim() || t.defaults.subject, v), html };
}
