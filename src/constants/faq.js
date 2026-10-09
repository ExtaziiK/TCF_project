// The FAQ (src/pages/FAQ.jsx). Every answer must stay true of the product —
// check before changing an offer: plans and durations in src/constants/pricing.js,
// what is free in src/auth/rbac.js, profiles in src/hooks/useProfiles.js,
// refunds in src/constants/terms.js §7.
//
// `id` is the anchor: /faq#<id> opens that question and scrolls to it (openFaq
// builds the link). Keep ids stable — other pages and emails link to them.
//
// Optional fields on an entry:
//   steps  — numbered steps shown under the answer
//   gif    — a screen recording of those steps (public/…), recorded on the live
//            site from a phone; keep width/height so the page does not jump
//   link   — { label, route } button under the answer
//   dzOnly — shown to visitors from Algeria only (useIsAlgeria): CCP and
//            BaridiMob are not offered anywhere else, so nobody else hears of them
// Every string goes through t(); its English is in src/i18n/en.js.

export const FAQS = [
  {
    id: "tcf-canada",
    q: "Qu'est-ce que le TCF Canada exactement ?",
    a: "Le TCF Canada est un test de français reconnu par Immigration, Réfugiés et Citoyenneté Canada (IRCC) pour les demandes de résidence permanente et de citoyenneté. Il évalue quatre compétences : compréhension orale, compréhension écrite, expression orale et expression écrite.",
  },
  {
    id: "validite-resultats",
    q: "Combien de temps les résultats sont-ils valables ?",
    a: "Les attestations du TCF Canada sont valables deux ans à compter de la date de passation. Pensez à planifier votre test en fonction du dépôt de votre dossier d'immigration.",
  },
  {
    id: "niveau-entree-express",
    q: "Quel niveau dois-je viser pour Entrée express ?",
    a: "Cela dépend de votre profil. Un niveau B2 (NCLC 7) dans les quatre compétences ouvre les tirages réservés aux francophones et les points bonus ; un niveau C1 (NCLC 9 et plus) maximise vos points de capital humain. Pour savoir où vous en êtes, passez le TCF blanc gratuit, puis convertissez vos scores avec le calculateur NCLC.",
    link: { label: "Ouvrir le calculateur NCLC", route: "calculator" },
  },
  {
    id: "gratuit-ou-forfait",
    q: "Qu'est-ce qui est gratuit, et qu'apporte un forfait ?",
    a: "Avec un compte gratuit : un quiz dans chaque épreuve, un TCF blanc complet, un sujet d'essai en expression écrite et orale avec correction par IA, les cartes de vocabulaire, la grammaire, la conjugaison et les sujets du mois. Un forfait débloque toute la banque de questions, la Révision (les questions les plus difficiles avec leur corrigé), la dictée, les modèles de réponse des sujets du mois et davantage de TCF blancs et de simulations IA.",
    link: { label: "Comparer les forfaits", route: "pricing" },
  },
  {
    id: "renouvellement",
    q: "Est-ce un abonnement qui se renouvelle ?",
    a: "Non. Les forfaits Starter (15 jours), Pro (30 jours) et Ultimate (90 jours) se paient une seule fois, sans renouvellement automatique : rien n'est prélevé à la fin. Vous recevez un rappel par courriel 3 jours avant l'échéance ; votre compte et votre progression restent ensuite disponibles en accès gratuit. Un forfait commencé n'est pas remboursable, sauf double paiement ou erreur de notre part.",
  },
  {
    id: "correction-ia",
    q: "Comment sont corrigées l'expression écrite et l'expression orale ?",
    a: "Par intelligence artificielle, en quelques secondes : une note estimée, les critères de l'examen, vos erreurs expliquées et des pistes pour progresser. Le compte gratuit permet de l'essayer sur un sujet d'essai ; le forfait Starter en donne 6 par jour à l'écrit et 6 à l'oral, Pro et Ultimate sont illimités.",
  },
  {
    id: "code-promo",
    q: "Comment utiliser un code promo ?",
    a: "Le code s'ajoute sur la page Tarifs, avant de choisir votre forfait. La remise s'applique au premier paiement.",
    steps: [
      "Ouvrez la page Tarifs.",
      "Dans « Vous avez un code promo ? », effacez ce qui s'y trouve déjà, puis tapez votre code.",
      "Appuyez sur Appliquer : un message confirme la remise et les prix baissent.",
      "Choisissez votre forfait : la remise vous suit jusqu'au paiement.",
    ],
    gif: { src: "/promo-tcf30.gif", width: 400, height: 193, alt: "Un code promo tapé dans « Vous avez un code promo ? », puis appliqué" },
    link: { label: "Aller à la page Tarifs", route: "pricing" },
  },
  {
    id: "paiement-ccp-baridimob",
    q: "Comment s'abonner et payer par CCP ou BaridiMob ?",
    a: "Depuis l'Algérie, vous pouvez payer en dinars, par virement CCP ou versement BaridiMob. Votre accès est activé dès que votre reçu est vérifié, en général en moins de 15 minutes.",
    steps: [
      "Sur la page Tarifs, choisissez l'onglet DZD.",
      "Appuyez sur « Choisir » sous le forfait qui vous convient.",
      "Choisissez BaridiMob ou CCP, puis envoyez le montant affiché vers le compte indiqué (le bouton Copier copie le numéro).",
      "Ajoutez une capture ou une photo de votre reçu, ou envoyez-le sur WhatsApp, puis indiquez votre numéro de téléphone.",
      "Appuyez sur « Envoyer ma demande d'abonnement ». Votre forfait s'active tout seul après vérification, sans avoir à vous reconnecter.",
    ],
    gif: { src: "/faq/abonnement-dz.gif", width: 320, height: 640, alt: "Le paiement en dinars : onglet DZD, choix du forfait, BaridiMob ou CCP, reçu et envoi de la demande" },
    link: { label: "Voir les tarifs en dinars", route: "pricing" },
    dzOnly: true,
  },
  {
    id: "deuxieme-profil",
    q: "Comment ajouter un deuxième profil ?",
    a: "Les forfaits Pro et Ultimate permettent de partager le compte en famille : 2 profils avec Pro, 4 avec Ultimate. Chaque profil garde sa propre progression, et peut être protégé par un code à quatre chiffres.",
    steps: [
      "Ouvrez le menu, puis appuyez sur l'icône « Changer de profil » à côté de votre nom.",
      "Appuyez sur « Ajouter ».",
      "Tapez le prénom, choisissez une couleur et, si vous le souhaitez, un code à quatre chiffres.",
      "Appuyez sur « Créer le profil ». À chaque connexion, choisissez qui apprend aujourd'hui.",
    ],
    gif: { src: "/faq/second-profil.gif", width: 320, height: 640, alt: "Le menu, « Changer de profil », « Ajouter », puis le nouveau profil créé" },
  },
  {
    id: "laisser-un-avis",
    q: "Comment laisser un avis ?",
    a: "Votre expérience aide les prochains candidats. Après votre premier TCF blanc, nous vous proposons de laisser un avis ; vous pouvez aussi l'écrire à tout moment depuis votre profil. C'est le même formulaire dans les deux cas : après validation par notre équipe, votre avis est publié sur la page Avis et peut apparaître sur la page d'accueil.",
    steps: [
      "Ouvrez le menu, puis « Mon profil ».",
      "Dans « Mon avis », choisissez une note, puis racontez votre expérience en quelques phrases (10 à 600 caractères).",
      "Si vous le souhaitez, ajoutez votre parcours (par exemple « Alger → Montréal ») et le résultat obtenu, ou masquez votre nom.",
      "Appuyez sur « Envoyer pour validation ». Vous pourrez le retirer à tout moment depuis votre profil.",
    ],
    gif: { src: "/faq/avis.gif", width: 320, height: 640, alt: "Mon profil, « Mon avis » rempli, puis « Envoyer pour validation »" },
    link: { label: "Lire les avis des candidats", route: "avis" },
  },
  {
    id: "supprimer-mon-compte",
    q: "Comment supprimer mon compte ?",
    a: "Vous pouvez le faire vous-même depuis votre profil. Votre compte est désactivé tout de suite, puis supprimé définitivement après 7 jours, avec toutes vos données. Si vous vous reconnectez pendant ces 7 jours, la suppression est annulée.",
    steps: [
      "Ouvrez le menu, puis « Mon profil ».",
      "Tout en bas de la page, appuyez sur « Supprimer mon compte ».",
      "Tapez SUPPRIMER pour confirmer, puis appuyez sur « Supprimer mon compte ».",
    ],
    gif: { src: "/faq/supprimer-compte.gif", width: 320, height: 640, alt: "Mon profil, « Supprimer mon compte », puis la confirmation en tapant SUPPRIMER" },
  },
  {
    id: "mobile",
    q: "La plateforme fonctionne-t-elle sur mobile ?",
    a: "Oui, dans le navigateur de votre téléphone, sans application à installer : vous pouvez réviser vos cartes de vocabulaire dans l'autobus. Pour un TCF blanc complet, un ordinateur reste plus confortable, avec un micro pour l'expression orale.",
  },
];

// The path of one question, for links from other pages: /faq#laisser-un-avis.
export const faqHash = (id) => `#${id}`;
