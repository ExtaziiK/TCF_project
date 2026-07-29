// Conditions générales d'utilisation.
//
// PLACEHOLDER — the real legal text is still to be written. What is finished
// and working is the ACCEPTANCE FLOW around it: the registration form makes a
// visitor open this document before the consent box can be ticked, and records
// which version they agreed to. Replacing the sections below with the final
// wording is all that remains; nothing else has to change.
//
// When the real text lands, bump TERMS_VERSION and set TERMS_DRAFT to false.
// The version string is stored on the user at signup (user_metadata
// .terms_version), so bumping it is what lets you tell later who accepted
// which text.

export const TERMS_VERSION = "draft-1";
export const TERMS_UPDATED = "29 juillet 2026";

// Flips the "still being written" notice on the page and in the dialog. Set to
// false once the sections below are the real conditions.
export const TERMS_DRAFT = true;

export const TERMS_DRAFT_NOTICE =
  "Ce document est en cours de rédaction. La version définitive des conditions générales sera publiée prochainement et remplacera ce texte. En attendant, les points ci-dessous résument nos engagements et ce que nous attendons de vous.";

// Each section: a heading and one or more paragraphs.
export const TERMS_SECTIONS = [
  {
    t: "1. Objet du service",
    p: [
      "Passerelle est une plateforme indépendante de préparation au TCF Canada. Elle propose des questions au format de l'examen, des corrections et un suivi de progression.",
      "Passerelle n'est ni affiliée ni mandatée par France Éducation international, par IRCC ou par tout centre d'examen agréé. Réussir sur la plateforme ne garantit aucun résultat à l'examen officiel.",
    ],
  },
  {
    t: "2. Compte et inscription",
    p: [
      "Vous devez fournir des informations exactes à l'inscription et garder votre mot de passe confidentiel. Vous êtes responsable de l'activité effectuée depuis votre compte.",
      "Un compte est personnel. Le partage d'identifiants entraîne la suspension du compte.",
    ],
  },
  {
    t: "3. Abonnements et paiement",
    p: [
      "Les forfaits payants donnent accès aux modules Premium pour la durée indiquée à l'achat. Les tarifs et les modalités de résiliation sont détaillés sur la page Tarifs.",
      "Les modalités de remboursement seront précisées dans la version définitive de ce document.",
    ],
  },
  {
    t: "4. Utilisation du contenu",
    p: [
      "Les questions, corrections, enregistrements et supports pédagogiques restent la propriété de Passerelle. Ils vous sont fournis pour votre préparation personnelle.",
      "La reproduction, la revente ou la diffusion publique de ce contenu est interdite.",
    ],
  },
  {
    t: "5. Données personnelles",
    p: [
      "Nous collectons les données nécessaires au fonctionnement du service : compte, progression, résultats et paiements. Elles ne sont pas revendues.",
      "La politique de confidentialité détaillée accompagnera la version définitive de ce document.",
    ],
  },
  {
    t: "6. Modification des conditions",
    p: [
      "Ces conditions peuvent évoluer. Toute modification importante vous sera signalée, et une nouvelle acceptation pourra vous être demandée à la connexion.",
    ],
  },
];
