import { paragraphs, signedLetter, greetingLine, promoBox, resultsBox } from "./emailLayout.js";
import { summarizeScore, SAMPLE_SCORE, practiceTips } from "./mockResults.js";

// The automatic account emails other than the welcome email (which has its own
// richer form, see welcomeTemplate.js). Each is editable from Administration →
// Emails: an on/off switch, a subject and one body. Stored as JSON in
// site_settings under its `key` (2000 characters max, the column's cap).
//
// Body syntax, shown in the editor too:
//   - a blank line separates paragraphs; **double asterisks** make bold;
//   - {placeholders} are filled when sending (the ones each email lists);
//   - a paragraph that is only [Text](target) becomes a button, the target
//     being one of LINK_TARGETS;
//   - in an email with a promo code (`promo`), a paragraph that is only
//     {encadre} becomes the code box (code, GIF, "how to" link);
//   - in the TCF blanc results email, a paragraph that is only {resultats}
//     becomes the results card (score, level, NCLC per section);
//   - a placeholder that comes out empty (e.g. {profils} on a Starter pass)
//     removes its paragraph.
//
// Placeholders whose name starts with "_" carry data, not text (the score
// behind {resultats}); the editor does not list them.
//
// `audience` marks an email sent by hand to a segment from the admin tab
// (api/_lib/offer.js) rather than by an event.
//
// Pure (no Node or browser APIs): shared by the senders and the preview.

export const EMAIL_MAX_CHARS = 2000;

export const LINK_TARGETS = {
  tarifs: "/tarifs",
  profil: "/profil",
  connexion: "/connexion",
  epreuves: "/mes-examens",
  accueil: "/",
  "tcf-blanc": "/tcf-blanc",
  revision: "/revision",
  dictee: "/dictee",
  contact: "/contact",
};

// The family-profiles line of the "your plan is active" emails: Pro holds 2
// profiles, Ultimate 4 (src/hooks/useProfiles.js maxProfilesFor, including the
// pre-rename labels). Empty for Starter, which removes the paragraph.
export function profilesPhrase(planLabel) {
  const l = String(planLabel || "").toLowerCase();
  const n = l === "ultimate" || l === "vip" ? 4 : l === "pro" || l === "première classe" ? 2 : 0;
  return n ? `**Profils** : votre forfait permet ${n} profils, chacun avec sa propre progression — idéal pour se préparer à plusieurs. Menu → « Changer de profil » → « Ajouter ».` : "";
}

// "5 novembre 2026", the way every email writes a date.
export const longDate = (iso) =>
  new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Toronto" });

// What a plan unlocks, shared by the two "your plan is active" emails.
const PLAN_TOUR = "Ce que votre forfait débloque :\n• **Toute la banque de questions** des quatre épreuves, avec les corrigés\n• **Révision** : les questions les plus difficiles, à relire ou à refaire\n• **La dictée** : un texte de niveau C1-C2 lu à voix haute, corrigé mot à mot\n• **Les modèles de réponse** C1-C2 des sujets du mois en expression écrite\n• **Les TCF blancs** et les simulations d'expression écrite et orale corrigées par IA\n\n{profils}";

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
  offer: {
    key: "email_offer",
    title: "Offre -50 % (comptes actifs)",
    when: "Envoyé à la main, avec le bouton ci-dessous, aux comptes qui ont utilisé le site au moins 2 jours différents sans jamais payer. Une seule fois par compte ; ceux qui ont reçu TCF50 en septembre sont exclus. {paiement} devient « par carte ou par CCP / BaridiMob » pour les comptes d'Algérie, « par carte bancaire » pour les autres.",
    audience: true,
    promo: { code: "TCF50", text: "Votre code : **-50 %** sur votre premier forfait" },
    // Filled per recipient by paymentPhrase(); the sample is the non-Algerian one.
    placeholders: { paiement: "par carte bancaire" },
    defaults: {
      subject: "Vous progressez : -50 % pour aller plus loin",
      body: "Vous vous êtes entraîné·e plusieurs fois sur **TCF Passerelle** ces dernières semaines, et c'est exactement comme ça qu'on progresse au TCF Canada.\n\nPour aller plus loin — toute la banque de questions avec les corrigés, plus de TCF blancs et les simulations d'expression écrite et orale corrigées par IA —, voici **-50 %** sur votre premier forfait :\n\n{encadre}\n\n[Voir les forfaits](tarifs)\n\nLe code s'applique au premier paiement, {paiement}.\n\nBonne préparation,\n\nVous ne souhaitez plus recevoir nos offres ? Répondez simplement « STOP » à ce courriel.",
    },
  },
  premiumWelcome: {
    key: "email_premium_welcome",
    title: "Bienvenue dans Premium (carte)",
    when: "Envoyé juste après un paiement par carte (Stripe), une fois par paiement. Stripe envoie déjà le reçu ; celui-ci explique ce que le forfait débloque.",
    placeholders: { forfait: "Pro", date: "5 novembre 2026", profils: profilesPhrase("Pro") },
    defaults: {
      subject: "Bienvenue dans {forfait} : votre accès est actif",
      body: "Merci pour votre confiance ! Votre forfait **{forfait}** est actif jusqu'au **{date}**.\n\n" + PLAN_TOUR + "\n\n[Commencer maintenant](epreuves)\n\nUne question sur votre forfait ? Répondez simplement à ce courriel.\n\nBonne préparation,",
    },
  },
  dzActivated: {
    key: "email_dz_activated",
    title: "Forfait activé (paiement en dinars)",
    when: "Envoyé quand une demande CCP / BaridiMob est approuvée (par vous, un administrateur ou le validateur).",
    placeholders: { forfait: "Pro", date: "5 novembre 2026", methode: "BaridiMob", profils: profilesPhrase("Pro") },
    defaults: {
      subject: "Votre forfait {forfait} est activé",
      body: "Bonne nouvelle : votre paiement par **{methode}** a été vérifié. Votre forfait **{forfait}** est actif jusqu'au **{date}**. Il s'affiche tout seul sur le site, sans avoir à vous reconnecter.\n\n" + PLAN_TOUR + "\n\n[Commencer maintenant](epreuves)\n\nUne question sur votre forfait ? Répondez simplement à ce courriel.\n\nBonne préparation,",
    },
  },
  inactiveNudge: {
    key: "email_inactive_nudge",
    title: "Relance : compte inactif (3 jours)",
    when: "Envoyé une seule fois, 3 jours après l'inscription, si le compte n'a encore rien fait : aucun quiz, aucun TCF blanc, aucune correction IA. Les comptes Premium ne le reçoivent pas.",
    placeholders: {},
    defaults: {
      subject: "Votre TCF blanc gratuit vous attend",
      body: "Votre compte **TCF Passerelle** est prêt, mais vous n'avez pas encore commencé votre préparation.\n\nLe meilleur point de départ : votre **TCF blanc gratuit**. Un examen complet et chronométré, comme le jour J — à la fin, vous saurez exactement où vous en êtes et quoi travailler.\n\n[Passer mon TCF blanc gratuit](tcf-blanc)\n\nPas le temps pour un examen complet ? Commencez par un premier quiz dans **Épreuves**, il est offert dans chaque épreuve.\n\nBonne préparation,",
    },
  },
  mockResults: {
    key: "email_mock_results",
    title: "Résultats du TCF blanc gratuit",
    when: "Envoyé juste après le TCF blanc gratuit, une seule fois par compte. L'aperçu montre un exemple de résultats ; chaque candidat reçoit les siens.",
    // {conseils}: practice tips for the weakest section, then general ones
    // (api/_lib/mockResults.js practiceTips) — filled per candidate.
    placeholders: { score: "482 / 699", niveau: "B2", faible: "Compréhension orale", conseils: practiceTips("co"), _score: SAMPLE_SCORE },
    defaults: {
      subject: "Vos résultats du TCF blanc : {score}",
      body: "Bravo, vous avez terminé votre TCF blanc ! Voici vos résultats :\n\n{resultats}\n\nVotre priorité : **{faible}**. C'est là que vous gagnerez le plus de points d'ici l'examen.\n\nL'expression écrite et orale sont auto-évaluées dans le TCF blanc gratuit ; pour une note détaillée, faites-les corriger par l'IA dans les ateliers.\n\n**Comment progresser sur TCF Passerelle :**\n{conseils}\n\nPour vous entraîner sur toute la banque de questions, avec la Révision, la dictée et d'autres TCF blancs :\n\n[Voir les forfaits](tarifs)\n\n**Besoin de conseils pour votre préparation ?** Répondez simplement à ce courriel ou écrivez-nous depuis la page Contact : notre équipe est là pour vous accompagner, à chaque étape.\n\nBonne préparation,",
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

// CCP / BaridiMob are Algerian payment methods, offered on the DZD tab only to
// visitors from Algeria (src/hooks/usePricingSelection.js) — so an email names
// them to an Algerian account and nobody else. The country is the one chosen
// at signup ("Algérie", see src/constants/exam.js), accent-insensitive.
export const isAlgerianAccount = (user) =>
  /^alg[eé]rie$|^algeria$/i.test(String(user?.user_metadata?.country || "").trim());

export const paymentPhrase = (user) =>
  isAlgerianAccount(user) ? "par carte ou par CCP / BaridiMob" : "par carte bancaire";

export function normalizeEmail(id, raw) {
  const t = EMAIL_TEMPLATES[id];
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {
    enabled: src.enabled === undefined ? true : src.enabled === true,
    subject: typeof src.subject === "string" ? src.subject : t.defaults.subject,
    body: typeof src.body === "string" ? src.body : t.defaults.body,
  };
  if (t.promo) {
    out.promoCode = (typeof src.promoCode === "string" ? src.promoCode : t.promo.code).trim().toUpperCase();
    out.promoText = typeof src.promoText === "string" ? src.promoText : t.promo.text;
  }
  return out;
}

export function parseEmail(id, value) {
  try { return normalizeEmail(id, value ? JSON.parse(value) : null); } catch { return normalizeEmail(id, null); }
}

// {name} → value, for the names this email declares; anything else is left
// as typed so a typo shows up in the preview instead of vanishing.
const fill = (text, vars) => String(text).replace(/\{([a-z]+)\}/gi, (m, k) => (k in vars && typeof vars[k] !== "object" ? String(vars[k]) : m));

// → { subject, html }. `vars` defaults to the template's sample values, which
// is what the preview and a test send use.
export function renderEmail(id, cfg, { firstName = "", vars, site }) {
  const t = EMAIL_TEMPLATES[id];
  const c = normalizeEmail(id, cfg);
  const v = { ...t.placeholders, ...(vars || {}) };
  const links = Object.fromEntries(Object.entries(LINK_TARGETS).map(([k, path]) => [k, `${site}${path}`]));
  const html = signedLetter(site, `
    ${greetingLine(firstName)}
    ${paragraphs(fill(c.body, v), { last: "4px", links, custom: {
      ...(t.promo ? { "{encadre}": promoBox(site, c.promoCode, c.promoText) } : {}),
      ...(v._score ? { "{resultats}": resultsBox(summarizeScore(v._score)) } : {}),
    } })}
  `);
  return { subject: fill(c.subject.trim() || t.defaults.subject, v), html };
}
