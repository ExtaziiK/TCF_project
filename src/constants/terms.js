// Conditions générales d'utilisation.
//
// The French text below is the contract; en.js carries an English courtesy
// translation and the document says outright that the French version prevails.
// TermsBody renders both the /conditions-generales page and the signup dialog
// from this one source, so the text a user accepts is provably the published
// one.
//
// ─────────────────────────────────────────────────────────────────────────────
// BEFORE PUBLISHING (setting TERMS_DRAFT = false), two things must be true:
//
//   1. OPERATOR below is filled in. Every {token} in the text is substituted
//      from it; while a value is empty the page shows a visible [à compléter]
//      marker instead. A paid service whose terms identify nobody is worth
//      little in a dispute and breaches EU e-commerce disclosure rules.
//
//   2. Stripe actually sells one-time passes. Section 6 states there is NO
//      automatic renewal, which is the intended model — but the live Stripe
//      prices are recurring and api/create-checkout-session.js refuses any
//      price that is not (`price.type !== "recurring"`), so today the passes
//      DO renew. Publishing this clause before that change would put a false
//      statement in the contract, which is worse than having no contract.
//
// Then: bump TERMS_VERSION, set TERMS_DRAFT = false. TERMS_REACCEPTANCE turns
// itself on and every existing account is asked to accept the new text.
// ─────────────────────────────────────────────────────────────────────────────

// Who the user is contracting with. Name, city and country identify a real
// person; the email is where legal notices and rights requests arrive.
export const OPERATOR = {
  name: "", // ex. "Prénom Nom"
  city: "", // ex. "Alger"
  country: "", // ex. "Algérie"
  email: "contact@tcfpasserelle.com",
};

// Substitutes the {tokens} in the text below. Applied by TermsBody AFTER
// translation, so a paragraph keeps a single stable i18n key whatever the
// operator's details are. Missing values stay visible rather than rendering an
// empty gap — an unfinished document should look unfinished.
export function fillOperator(text) {
  return String(text)
    .replace(/\{nom\}/g, OPERATOR.name || "[à compléter]")
    .replace(/\{ville\}/g, OPERATOR.city || "[à compléter]")
    .replace(/\{pays\}/g, OPERATOR.country || "[à compléter]")
    .replace(/\{courriel\}/g, OPERATOR.email);
}

// Bumped whenever the wording changes: every acceptance is recorded against
// this string (terms_acceptances, 20260730 migration), which is what lets you
// tell later who agreed to which text. Keep each published version in git.
export const TERMS_VERSION = "draft-2";
export const TERMS_UPDATED = "30 juillet 2026";

// Flips the "still being written" notice on the page and in the dialog. Set to
// false once the two conditions at the top of this file are met.
export const TERMS_DRAFT = true;

// Whether signed-in accounts are asked to accept again when TERMS_VERSION moves
// past what they agreed to (TermsGate). Off while the text is a draft: making
// people accept a document that announces it is provisional collects consent
// worth little, and nags them twice. Publishing the real conditions — set
// TERMS_DRAFT to false and bump TERMS_VERSION — is what starts the wave, and it
// reaches the accounts that predate consent tracking as well.
export const TERMS_REACCEPTANCE = !TERMS_DRAFT;

export const TERMS_DRAFT_NOTICE =
  "Ce document est rédigé mais n'est pas encore en vigueur : les coordonnées de l'éditeur et les modalités de paiement définitives doivent y être ajoutées. La version applicable sera publiée prochainement et vous sera soumise pour acceptation.";

// Each section: a heading and one or more paragraphs.
export const TERMS_SECTIONS = [
  {
    t: "1. Qui édite Passerelle",
    p: [
      "Passerelle (« la Plateforme », « le Service ») est un service en ligne de préparation au TCF Canada édité par {nom}, personne physique domiciliée à {ville}, {pays} (« l'Éditeur », « nous »). Toute question ou notification relative aux présentes conditions peut être adressée à {courriel}.",
      "Passerelle est un projet personnel et indépendant, né de l'envie d'aider les candidats à s'entraîner sérieusement avant le jour de l'examen. Ce n'est ni une école, ni un centre d'examen, ni un organisme officiel : c'est un outil d'entraînement, conçu et maintenu par une personne, que vous utilisez librement.",
      "Passerelle n'est ni affiliée, ni mandatée, ni agréée, ni approuvée par France Éducation international, par Immigration, Réfugiés et Citoyenneté Canada (IRCC), par la Chambre de commerce et d'industrie de Paris, ni par aucun centre d'examen agréé ou organisme organisateur d'un test de français. Les marques « TCF », « TCF Canada » et les autres noms d'examens cités appartiennent à leurs titulaires respectifs et ne sont mentionnés qu'à titre descriptif, pour indiquer à quoi la Plateforme prépare.",
      "La Plateforme ne fait pas passer l'examen officiel, ne délivre aucune attestation reconnue, n'inscrit personne à une session et ne transmet aucun résultat aux autorités ou aux centres d'examen. Les scores, niveaux et corrections affichés sont des estimations pédagogiques produites par nos soins.",
    ],
  },
  {
    t: "2. Acceptation et évolution des conditions",
    p: [
      "La création d'un compte suppose la lecture et l'acceptation des présentes conditions générales d'utilisation (« CGU »). Cette acceptation est enregistrée : nous conservons la version acceptée, la date et l'heure, ainsi que l'adresse IP et le navigateur utilisés, à seule fin de prouver le consentement en cas de litige.",
      "Les CGU peuvent évoluer, notamment pour suivre une modification du Service ou de la réglementation. En cas de modification substantielle, la nouvelle version vous est présentée à la connexion et votre acceptation est de nouveau demandée. Si vous refusez, vous pouvez cesser d'utiliser le Service et demander la fermeture de votre compte ; l'accès Premium éventuellement en cours n'est alors pas remboursé au prorata, sauf disposition impérative contraire.",
      "La version française des présentes CGU fait foi. Toute traduction, notamment anglaise, est fournie à titre de commodité et ne prévaut pas sur le texte français.",
    ],
  },
  {
    t: "3. Conditions d'accès et âge minimum",
    p: [
      "La création d'un compte gratuit est réservée aux personnes âgées d'au moins 16 ans. L'achat d'un pass payant est réservé aux personnes âgées d'au moins 18 ans, ou aux mineurs disposant de l'autorisation préalable du titulaire de l'autorité parentale, qui assume alors la responsabilité du paiement.",
      "En créant un compte, vous déclarez remplir ces conditions. Nous pouvons suspendre un compte dont il apparaît qu'il a été ouvert en violation du présent article.",
    ],
  },
  {
    t: "4. Compte, identifiants et appareils",
    p: [
      "Vous vous engagez à fournir des informations exactes à l'inscription et à les tenir à jour. Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte. Prévenez-nous sans délai à {courriel} si vous suspectez un accès non autorisé.",
      "Un compte est strictement personnel et ne peut être partagé, prêté, revendu ni utilisé par plusieurs personnes. Le partage d'identifiants entraîne la suspension du compte sans remboursement.",
      "Le nombre d'appareils pouvant être connectés simultanément dépend du forfait : un appareil pour les comptes gratuits et les pass Passeport et Visa, deux pour Première classe, quatre pour VIP. Au-delà, la connexion la plus récente est acceptée et l'appareil connecté le plus anciennement est déconnecté automatiquement : vous n'êtes jamais bloqué hors de votre propre compte, mais vos sessions les plus anciennes prennent fin.",
      "La connexion peut se faire par courriel et mot de passe, ou via un compte Google. Dans ce dernier cas, seules les informations nécessaires à la création du compte nous sont transmises par Google.",
    ],
  },
  {
    t: "5. Contenu du Service",
    p: [
      "Le Service donne accès, selon le forfait, à des questions au format de l'examen (compréhension orale et écrite), à des sujets d'expression écrite et orale, à des corrections et explications, à des fiches de vocabulaire et de grammaire, à des TCF blancs chronométrés et à un suivi de progression.",
      "Un compte gratuit donne accès à une partie de ce contenu. Les pass payants ouvrent l'ensemble des modules Premium pour la durée indiquée à l'achat. Le détail des offres figure sur la page Tarifs, qui fait partie intégrante des présentes CGU.",
      "Tous les exercices sont rédigés ou sélectionnés par nos soins pour reproduire le format, le minutage et le niveau de difficulté de l'épreuve. Ce ne sont ni des sujets officiels, ni des annales, ni des questions réelles de l'examen : aucun contenu de l'examen officiel n'est reproduit sur la Plateforme, qui n'y a pas accès.",
      "Le contenu est enrichi et corrigé régulièrement. Nous pouvons ajouter, modifier ou retirer des exercices sans préavis, sous réserve de ne pas vider de sa substance le forfait que vous avez acheté pendant sa durée de validité.",
    ],
  },
  {
    t: "6. Prix, paiement et durée d'accès",
    p: [
      "Les prix sont affichés en dollars américains (USD) sur la page Tarifs. Le montant effectivement dû est celui présenté sur la page de paiement avant confirmation. Les éventuels frais bancaires, frais de conversion ou taxes locales appliqués par votre banque restent à votre charge.",
      "Chaque pass est un achat unique qui ouvre l'accès Premium pour la durée annoncée (5, 15, 30 ou 90 jours selon le forfait). Il n'y a pas de reconduction tacite : à l'échéance, l'accès Premium prend fin automatiquement et aucun nouveau prélèvement n'est effectué. Vous restez libre d'acheter un nouveau pass.",
      "Le paiement par carte bancaire est traité par Stripe. Nous ne recevons ni ne conservons vos données de carte. Pour l'Algérie, un paiement manuel par CCP ou BaridiMob est proposé : l'accès est activé après vérification du versement, ce qui peut prendre jusqu'à quelques jours ouvrables, et la durée du pass court à compter de cette activation.",
      "Les codes promotionnels sont valables selon les conditions annoncées lors de leur diffusion, ne sont pas cumulables sauf mention contraire et ne peuvent donner lieu à aucune contrepartie en espèces.",
    ],
  },
  {
    t: "7. Droit de rétractation et remboursements",
    p: [
      "L'accès au contenu Premium est ouvert immédiatement après la confirmation du paiement. En achetant un pass, vous demandez expressément l'exécution immédiate du Service et reconnaissez perdre, de ce fait, le droit de rétractation prévu pour les contrats à distance portant sur un contenu numérique, dans la mesure permise par la loi applicable.",
      "En conséquence, un pass entamé n'est pas remboursable. Nous procédons néanmoins au remboursement en cas de double facturation, d'erreur de notre part, ou d'indisponibilité prolongée du Service qui nous serait imputable. Les demandes s'adressent à {courriel}.",
      "L'ouverture d'une contestation bancaire (chargeback) sans avoir cherché au préalable une solution avec nous entraîne la suspension immédiate du compte, le temps que la situation soit examinée.",
      "Les dispositions impératives protégeant les consommateurs dans leur pays de résidence restent applicables et priment sur le présent article lorsqu'elles sont plus favorables.",
    ],
  },
  {
    t: "8. Corrections automatiques et intelligence artificielle",
    p: [
      "Les épreuves d'expression écrite et orale peuvent être analysées automatiquement. Vos textes, et la transcription de vos enregistrements vocaux, sont transmis à des prestataires techniques d'intelligence artificielle pour produire une correction et une estimation de niveau. La voix de l'examinateur virtuel est générée par un service de synthèse vocale.",
      "Vos enregistrements audio ne sont pas conservés : ils sont transcrits puis supprimés. Seules des données techniques (taille du fichier, durée du traitement) sont journalisées pour le suivi des coûts et la prévention des abus.",
      "Les corrections, notes et niveaux produits automatiquement sont indicatifs et pédagogiques. Ils peuvent comporter des erreurs, ne constituent en aucun cas un résultat officiel et ne préjugent pas de la note que vous obtiendrez à l'examen réel.",
      "Nous le répétons parce que c'est important : Passerelle n'a aucun lien avec les organismes qui conçoivent, administrent ou corrigent l'examen officiel. Notre barème est une estimation faite de notre côté, avec nos propres critères ; il n'a aucune valeur officielle et personne d'autre que nous n'en répond.",
    ],
  },
  {
    t: "9. Absence de conseil en immigration",
    p: [
      "Les informations relatives au TCF Canada, à Entrée express, aux seuils de points ou aux démarches d'immigration sont fournies à titre informatif et pédagogique. Elles ne constituent ni un conseil juridique, ni un conseil en immigration, et peuvent ne plus être à jour.",
      "Seules les sources officielles, notamment IRCC et les centres d'examen agréés, font foi. Il vous appartient de les consulter et, le cas échéant, de vous adresser à un professionnel habilité.",
    ],
  },
  {
    t: "10. Propriété intellectuelle",
    p: [
      "L'ensemble des contenus de la Plateforme — questions, textes, enregistrements audio, corrections, explications, fiches, illustrations, marque, logo, code et interface — est protégé et demeure la propriété de l'Éditeur ou de ses partenaires.",
      "L'achat d'un pass confère un droit d'usage personnel, non exclusif et non transférable, limité à votre préparation individuelle et à la durée du pass. Sont notamment interdits : la reproduction, la diffusion publique, la revente, le partage de comptes, la constitution de bases de données à partir du contenu, ainsi que toute extraction automatisée (robots, aspirateurs de site, scripts, captures massives).",
      "Le contenu que vous produisez sur la Plateforme — réponses aux exercices, témoignages — vous appartient. En soumettant un témoignage, vous nous autorisez à le publier sur le site, tel que vous l'avez rédigé, avec le prénom et la ville que vous avez indiqués. Vous pouvez en demander le retrait à tout moment à {courriel}.",
    ],
  },
  {
    t: "11. Usages interdits",
    p: [
      "Il est interdit de tenter de contourner les limitations techniques du Service, notamment le nombre d'appareils, les restrictions d'accès au contenu Premium ou les quotas d'usage ; d'accéder au Service par un moyen automatisé ; d'analyser, décompiler ou reproduire tout ou partie du code ; de perturber le fonctionnement de la Plateforme ou d'en compromettre la sécurité.",
      "Il est également interdit de transmettre, via les exercices, le formulaire de contact ou les témoignages, tout contenu illicite, diffamatoire, haineux, contrefaisant, ou les données personnelles d'un tiers sans son accord.",
      "Tout manquement peut entraîner, selon sa gravité, un avertissement, la suspension ou la fermeture définitive du compte, sans remboursement des sommes versées et sans préjudice de poursuites.",
    ],
  },
  {
    t: "12. Disponibilité, maintenance et assistance",
    p: [
      "Nous mettons en œuvre les moyens raisonnables pour maintenir la Plateforme accessible, sans garantir une disponibilité ininterrompue. Le Service repose sur des prestataires tiers (hébergement, base de données, paiement, intelligence artificielle) dont les incidents peuvent l'affecter.",
      "Des interruptions peuvent survenir pour maintenance, mise à jour ou raison de sécurité. Une interruption brève ou ponctuelle n'ouvre pas droit à indemnisation ou à prolongation ; une indisponibilité prolongée qui nous serait imputable peut donner lieu à une prolongation du pass ou à un remboursement, apprécié de bonne foi.",
      "L'assistance est assurée par courriel à {courriel}. Nous répondons dans un délai raisonnable, sans garantie de délai. Aucun autre canal d'assistance n'est proposé à ce jour.",
    ],
  },
  {
    t: "13. Responsabilité",
    p: [
      "Le Service est un outil d'entraînement proposé par une personne indépendante, sans aucun lien avec l'organisation de l'examen officiel. Nous ne garantissons ni la réussite à l'examen, ni l'obtention d'un niveau déterminé, ni aucune conséquence favorable sur une démarche d'immigration. Les résultats dépendent de votre travail personnel et de facteurs qui nous échappent.",
      "Notre responsabilité ne peut être engagée pour les dommages indirects, notamment la perte de chance, l'échec à un examen, le rejet ou le retard d'une demande d'immigration, la perte de données ou le manque à gagner.",
      "En tout état de cause, et dans la limite de ce que permet la loi applicable, notre responsabilité totale au titre des présentes est plafonnée aux sommes que vous nous avez effectivement versées au cours des douze mois précédant le fait générateur.",
      "Aucune stipulation des présentes n'a pour effet d'exclure ou de limiter notre responsabilité en cas de dol, de faute lourde, d'atteinte aux personnes, ou dans les autres cas où la loi l'interdit.",
    ],
  },
  {
    t: "14. Données personnelles",
    p: [
      "Nous traitons des données personnelles pour faire fonctionner le Service : compte, progression, résultats, paiements, ainsi que la preuve d'acceptation des présentes CGU. Ces données ne sont ni vendues, ni louées, ni cédées à des fins publicitaires.",
      "Les finalités, les destinataires, les durées de conservation et les moyens d'exercer vos droits (accès, rectification, suppression, opposition) sont détaillés dans notre Politique de confidentialité, qui complète les présentes CGU. Toute demande relative à vos données peut être adressée à {courriel}.",
    ],
  },
  {
    t: "15. Suspension, fermeture du compte et fin du Service",
    p: [
      "Vous pouvez cesser d'utiliser le Service à tout moment et demander la suppression de votre compte en écrivant à {courriel}. La suppression est traitée dans un délai de trente jours ; un pass en cours n'est alors pas remboursé.",
      "Nous pouvons suspendre ou fermer un compte en cas de manquement aux présentes CGU, de fraude, d'impayé ou d'usage manifestement abusif du Service. Sauf urgence ou manquement grave, nous vous en informons au préalable et vous laissons la possibilité de vous expliquer.",
      "Nous pouvons faire évoluer le Service ou cesser de l'exploiter. Dans ce dernier cas, les pass en cours sont remboursés au prorata de la durée restante.",
    ],
  },
  {
    t: "16. Droit applicable et règlement des litiges",
    p: [
      "Les présentes CGU sont régies par le droit de {pays}, sans préjudice des dispositions impératives plus protectrices applicables dans votre pays de résidence habituelle.",
      "En cas de difficulté, adressez-vous d'abord à nous à {courriel} : la plupart des situations se règlent ainsi. À défaut d'accord amiable, le litige relève des tribunaux compétents de {pays}, étant précisé que, si vous agissez en qualité de consommateur, vous conservez la faculté de saisir la juridiction de votre lieu de résidence lorsque la loi vous le permet.",
    ],
  },
  {
    t: "17. Dispositions diverses",
    p: [
      "Si une clause des présentes est jugée nulle ou inapplicable, les autres clauses demeurent en vigueur et la clause concernée est remplacée par une stipulation valide d'effet équivalent.",
      "Le fait de ne pas se prévaloir d'un manquement ne vaut pas renonciation à s'en prévaloir ultérieurement. Les présentes CGU, complétées par la page Tarifs et la Politique de confidentialité, expriment l'intégralité de l'accord entre vous et l'Éditeur au titre du Service.",
    ],
  },
];
