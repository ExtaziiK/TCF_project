// Mentions légales.
//
// Fourth of the footer's legal documents: who publishes the site, who hosts
// it, and who owns what is on it. Same shape as the accessibility statement
// (constants/accessibility.js), rendered by LegalNoticeBody with the same
// {courriel} substitution.
//
// ─────────────────────────────────────────────────────────────────────────────
// Section 1 follows the choice recorded at the top of constants/terms.js: the
// site names no person and no country, and the email is the only point of
// contact. A legal notice normally identifies its publisher (for a publisher
// based in France, the LCEN asks for a name and an address), so this page is
// where that choice is most visible. Filling an identity back in means editing
// section 1 here as well as section 1 and section 16 of the CGU and section 1
// of the privacy policy — all four together.
// ─────────────────────────────────────────────────────────────────────────────

export const NOTICE_UPDATED = "30 octobre 2026";

export const NOTICE_SECTIONS = [
  {
    t: "1. Éditeur du site",
    p: [
      "Le site www.tcfpasserelle.com et la plateforme Passerelle sont édités et exploités à titre individuel. Passerelle est un projet personnel et indépendant de préparation au TCF Canada.",
      "Contact : {courriel}. Cette adresse est le point de contact unique du site pour toute question, réclamation, demande relative à vos données ou notification légale.",
    ],
  },
  {
    t: "2. Directeur de la publication",
    p: [
      "Le directeur de la publication est l'éditeur du site, joignable à l'adresse {courriel}.",
    ],
  },
  {
    t: "3. Hébergement",
    p: [
      "Le site est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis (vercel.com).",
      "La base de données, les comptes et l'authentification sont hébergés par Supabase, Inc. (supabase.com). La liste complète des prestataires qui traitent des données pour le compte de Passerelle figure dans la politique de confidentialité.",
    ],
  },
  {
    t: "4. Indépendance",
    p: [
      "Passerelle n'est ni affiliée, ni mandatée, ni agréée, ni approuvée par France Éducation international, par Immigration, Réfugiés et Citoyenneté Canada (IRCC), ni par aucun centre d'examen agréé. Elle ne fait pas passer l'examen officiel et ne délivre aucune attestation reconnue.",
      "« TCF » et « TCF Canada » sont des marques de France Éducation international. Elles sont citées à titre descriptif, pour indiquer à quel examen la plateforme prépare.",
    ],
  },
  {
    t: "5. Propriété intellectuelle",
    p: [
      "Les contenus de Passerelle — questions et séries d'entraînement, textes, articles, corrigés, modèles de réponse, enregistrements, illustrations, logo et interface — sont protégés par le droit d'auteur. Sauf mention contraire, ils appartiennent à l'éditeur.",
      "Toute reproduction, extraction ou diffusion de tout ou partie de ces contenus, notamment de la banque de questions, sans autorisation écrite préalable est interdite. Vous pouvez citer de courts extraits des articles du blogue, avec un lien vers la page d'origine.",
      "Certaines photographies du blogue sont publiées sous licence libre : leur auteur et leur licence sont indiqués sous chaque image concernée.",
    ],
  },
  {
    t: "6. Données personnelles et cookies",
    p: [
      "Les données collectées sur Passerelle, leur finalité, leur durée de conservation et la manière d'exercer vos droits sont décrites dans la politique de confidentialité. La mesure d'audience ne dépose pas de cookie.",
    ],
  },
  {
    t: "7. Signaler un contenu",
    p: [
      "Si un contenu publié sur Passerelle vous paraît illicite, inexact ou porte atteinte à vos droits, écrivez à {courriel} en indiquant la page concernée et la raison de votre signalement. Nous l'examinons et vous répondons dans les meilleurs délais.",
    ],
  },
];
