import { TERMS_DRAFT } from "@/constants/terms";

// Politique de confidentialité. Companion to constants/terms.js: same French
// source + English courtesy translation, same {tokens} filled from OPERATOR,
// same rendering path (PrivacyBody → the /politique-de-confidentialite page).
//
// The content describes what the code ACTUALLY does — every processor named
// below appears in this repository (Supabase, Vercel, Stripe, Groq, Azure
// Speech, Hostinger mail, Google sign-in), and nothing is claimed that isn't
// implemented. If you add a service that touches user data, add it to section 4
// in the same commit; that is the whole point of this document.
//
// Publishes together with the CGU: both need OPERATOR filled in, and a privacy
// policy that names no controller is worth as little as terms that name no
// publisher.
export const PRIVACY_DRAFT = TERMS_DRAFT;
export const PRIVACY_UPDATED = "30 juillet 2026";

export const PRIVACY_DRAFT_NOTICE =
  "Ce document est rédigé mais n'est pas encore en vigueur. La version applicable sera publiée en même temps que les conditions générales d'utilisation.";

export const PRIVACY_SECTIONS = [
  {
    t: "1. Responsable du traitement",
    p: [
      "Le responsable du traitement des données collectées sur Passerelle est l'éditeur de la Plateforme, qui l'exploite à titre individuel. Pour toute question relative à vos données, pour exercer vos droits ou pour toute réclamation, écrivez à {courriel} : c'est le canal prévu pour l'ensemble de ces demandes, et il est relevé.",
      "La présente politique explique quelles données nous collectons, pourquoi, avec qui elles sont partagées, combien de temps elles sont conservées et comment vous en gardez le contrôle. Elle complète les conditions générales d'utilisation.",
    ],
  },
  {
    t: "2. Données que nous collectons",
    p: [
      "Compte : le prénom ou le nom que vous saisissez, votre nom d'utilisateur, votre adresse de courriel, votre pays et votre mot de passe, ce dernier étant conservé sous forme chiffrée et jamais lisible par nous. Si vous vous connectez avec Google, nous recevons de Google votre adresse de courriel, votre nom et un identifiant technique — jamais votre mot de passe Google.",
      "Utilisation du Service : vos résultats de quiz, vos réponses, vos tentatives de TCF blancs, les questions mises en signet et les niveaux estimés qui en découlent. Ces données servent à afficher votre progression.",
      "Expression écrite et orale : les textes que vous rédigez et les enregistrements que vous soumettez pour correction. Les enregistrements audio ne sont pas conservés — ils sont transmis pour transcription puis supprimés. Nous journalisons uniquement des données techniques sans contenu (taille du fichier, durée du traitement, volume de texte analysé), pour suivre les coûts et prévenir les abus.",
      "Paiement : nous conservons un identifiant client du prestataire de paiement, le forfait acheté et sa date d'échéance. Nous ne recevons ni ne conservons vos numéros de carte bancaire. Pour un paiement manuel par CCP ou BaridiMob, nous conservons la demande et les éléments que vous nous transmettez pour vérifier le versement.",
      "Preuve d'acceptation des conditions générales : la version acceptée, la date et l'heure, votre adresse IP et votre navigateur. Cette donnée existe pour prouver votre consentement en cas de litige, et pour rien d'autre.",
      "Sécurité et sessions : les identifiants techniques de vos appareils connectés, la date de votre dernière activité, ainsi que des compteurs anti-abus indexés sur l'adresse IP pour limiter les tentatives de connexion et l'usage automatisé.",
      "Échanges et contributions : les messages envoyés via le formulaire de contact (nom, courriel, sujet, message) et, si vous en soumettez un, votre témoignage avec le prénom et la ville que vous indiquez.",
    ],
  },
  {
    t: "3. Pourquoi nous traitons ces données",
    p: [
      "Exécuter le contrat qui nous lie : créer et maintenir votre compte, donner accès au contenu, enregistrer votre progression, corriger vos productions, traiter votre paiement et vous fournir l'assistance demandée.",
      "Respecter nos obligations légales : conservation des pièces comptables liées aux paiements, réponse aux demandes d'exercice de droits.",
      "Poursuivre nos intérêts légitimes, de manière proportionnée : sécuriser les comptes, faire respecter la limite d'appareils, prévenir la fraude et les abus, prouver l'acceptation des conditions générales, et mesurer l'audience du site de façon agrégée pour l'améliorer.",
      "Lorsque la loi applicable exige votre consentement pour un traitement particulier, celui-ci vous est demandé séparément et vous pouvez le retirer à tout moment.",
    ],
  },
  {
    t: "4. Prestataires qui traitent des données pour nous",
    p: [
      "Nous ne vendons, ne louons et n'échangeons aucune donnée personnelle. Nous faisons appel à des prestataires techniques qui agissent sur nos instructions, chacun pour une finalité précise :",
      "Supabase — hébergement de la base de données et gestion des comptes et de l'authentification. Vercel — hébergement du site et mesure d'audience agrégée. Stripe — traitement des paiements par carte. Groq — transcription des enregistrements et correction automatique des productions écrites et orales. Microsoft Azure — synthèse vocale de l'examinateur virtuel. Hostinger — envoi des courriels du service. Google — connexion par compte Google, si vous choisissez cette option.",
      "Nous pouvons également communiquer des données lorsqu'une obligation légale nous l'impose, ou pour constater, exercer ou défendre un droit en justice.",
    ],
  },
  {
    t: "5. Transferts hors de votre pays",
    p: [
      "Nos prestataires peuvent héberger ou traiter des données en dehors de votre pays de résidence, notamment aux États-Unis et dans l'Union européenne. Ces transferts s'effectuent sur la base des garanties prévues par la réglementation applicable, telles que les clauses contractuelles types ou une décision d'adéquation.",
    ],
  },
  {
    t: "6. Combien de temps nous conservons vos données",
    p: [
      "Les données de compte et de progression sont conservées tant que votre compte existe. Après la suppression du compte, elles sont effacées dans un délai de trente jours, à l'exception de ce qui suit.",
      "Les pièces liées aux paiements sont conservées pendant la durée exigée par la réglementation comptable et fiscale applicable.",
      "La preuve d'acceptation des conditions générales est conservée pendant la vie du compte puis, après sa suppression, pendant la durée de prescription applicable au contrat : sans elle, nous ne pourrions plus démontrer les termes que vous avez acceptés.",
      "Les journaux techniques, les compteurs anti-abus et les enregistrements de sessions d'appareils sont conservés pour une durée courte, proportionnée à leur finalité de sécurité. Un témoignage publié reste en ligne jusqu'à ce que vous en demandiez le retrait.",
    ],
  },
  {
    t: "7. Vos droits",
    p: [
      "Vous disposez d'un droit d'accès à vos données, de rectification, d'effacement, de limitation et d'opposition au traitement, ainsi que d'un droit à la portabilité des données que vous nous avez fournies. Vous pouvez également retirer, à tout moment, un consentement que vous auriez donné.",
      "Une partie de ces droits s'exerce directement depuis votre espace : vos informations de compte et votre mot de passe se modifient dans la page Profil. Pour la suppression de votre compte, l'accès à l'ensemble de vos données ou toute autre demande, écrivez à {courriel} : nous répondons dans un délai de trente jours.",
      "Nous pouvons demander un élément permettant de vérifier votre identité avant de donner suite, afin de ne pas divulguer vos données à un tiers.",
      "Si notre réponse ne vous satisfait pas, vous pouvez saisir l'autorité de protection des données compétente dans votre pays de résidence — par exemple la CNIL en France, ou la Commission d'accès à l'information au Québec.",
    ],
  },
  {
    t: "8. Sécurité",
    p: [
      "Les échanges avec la Plateforme sont chiffrés (HTTPS). Les mots de passe sont stockés sous forme chiffrée. L'accès aux données est cloisonné au niveau de la base : par défaut, un compte ne peut lire que ses propres enregistrements.",
      "Nous limitons le nombre de sessions simultanées par compte, comptons les tentatives de connexion échouées et journalisons les actions d'administration. Aucun système n'étant infaillible, nous vous invitons à utiliser un mot de passe unique et à nous signaler sans délai toute activité suspecte.",
    ],
  },
  {
    t: "9. Cookies et stockage local",
    p: [
      "Passerelle n'utilise ni cookie publicitaire, ni cookie de suivi comportemental, ni traceur tiers à des fins de profilage.",
      "Le site conserve dans votre navigateur les seules informations nécessaires à son fonctionnement : votre session de connexion, l'identifiant technique de l'appareil, votre préférence de thème et de langue, et quelques repères d'affichage. Les effacer vous déconnecte, sans autre conséquence.",
      "La mesure d'audience est assurée par Vercel Web Analytics, qui ne dépose pas de cookie et ne produit que des statistiques agrégées (pages vues, provenance, type d'appareil) sans permettre de vous identifier.",
    ],
  },
  {
    t: "10. Mineurs",
    p: [
      "Le Service n'est pas destiné aux personnes de moins de 16 ans, et l'achat d'un pass est réservé aux personnes majeures ou autorisées par le titulaire de l'autorité parentale. Si nous apprenons qu'un compte a été créé par un enfant en deçà de cet âge, nous le supprimons.",
    ],
  },
  {
    t: "11. Modification de la présente politique",
    p: [
      "Cette politique peut évoluer, en particulier si le Service change ou si nous faisons appel à un nouveau prestataire. La date de dernière mise à jour figure en tête du document, et toute modification substantielle vous sera signalée par courriel ou lors de votre prochaine connexion.",
      "Pour toute question relative à la présente politique, écrivez-nous à {courriel}.",
    ],
  },
];
