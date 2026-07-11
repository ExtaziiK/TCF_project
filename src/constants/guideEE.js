// Detailed method for the TCF Canada "Expression écrite" épreuve, shown on the
// dedicated guide page (pages/GuideExpressionEcrite.jsx) linked from the exam
// guide. Content is a cleaned-up, presentable version of the classic
// task-by-task method taught for this épreuve.

// What the épreuve assesses.
export const EE_CRITERIA = [
  "Communiquer un message de façon claire.",
  "Donner les informations demandées.",
  "Décrire, raconter, expliquer.",
  "Justifier un choix, une position, une décision.",
  "Enchaîner des idées et faire preuve de cohérence.",
  "Comparer deux points de vue.",
  "Exprimer votre avis et l'argumenter.",
  "Utiliser un vocabulaire et des structures adaptés à la tâche.",
  "Faire une synthèse et reformuler.",
];

// The three tasks, each with its brief, word range and a structured method.
export const EE_METHOD = [
  {
    n: 1,
    title: "Le message",
    words: "60 à 120 mots",
    brief: "Rédaction d'un message pour décrire, raconter et/ou expliquer, adressé à un ou plusieurs destinataires dont le statut est précisé dans la consigne.",
    structureTitle: "La structure du message",
    steps: [
      { s: "Objet", d: "Un objet court et clair. Ex. : « Mes congés à Marrakech »." },
      { s: "Salutations", d: "Adaptez le registre au destinataire. Ex. : « Coucou Nabil, comment vas-tu ? »." },
      { s: "Objectif du message", d: "Annoncez d'emblée pourquoi vous écrivez. Ex. : « Je t'écris pour te dire que je serai à Paris. »." },
      { s: "Détails de la circonstance", d: "Répondez à : qui ? quoi ? quand ? où ? avec qui ?" },
      { s: "Attentes concrètes", d: "Selon la consigne. Ex. : « J'aimerais que tu repères des endroits chics à visiter. »." },
      { s: "Formules de clôture", d: "Recommandation, promesse ou remerciement." },
      { s: "Salutations finales", d: "« À bientôt », « Porte-toi bien », « Amicalement », « Cordialement »…" },
    ],
  },
  {
    n: 2,
    title: "Le compte rendu / l'article",
    words: "120 à 150 mots",
    brief: "Rédaction d'un article, d'un courrier ou d'une note à l'intention de plusieurs destinataires : un compte rendu d'expérience ou un récit, accompagné de commentaires, d'opinions ou d'arguments selon un objectif (revendiquer, se réconcilier…).",
    note: "L'objectif : raconter ou rendre compte pour plaire, attirer ou réconcilier. Pour un courriel, réutilisez la structure de la Tâche 1 ; pour un article de blog, suivez la structure ci-dessous.",
    example: "Exemple de consigne : « Rédigez un article de blog sur un métier qui vous passionne, en donnant envie aux gens de s'y intéresser. »",
    structureTitle: "La structure de l'article de blog",
    steps: [
      { s: "Un titre accrocheur", d: "Ex. : « Enseigner, un métier de nobles ». Un bon titre donne envie de lire (comme « 3 façons de reconquérir son ex »)." },
      { s: "Présentation de l'activité", d: "Premier paragraphe : présentez le sujet de façon succincte et attirante. C'est quoi ? Apportez des informations perspicaces." },
      { s: "Votre expérience", d: "Racontez votre propre expérience, avec des détails concrets." },
      { s: "Recommandations", d: "Invitez vos lecteurs à s'intéresser à l'activité. Adaptez toujours à la consigne." },
    ],
  },
  {
    n: 3,
    title: "Comparer deux points de vue",
    words: "120 à 180 mots",
    brief: "Rédaction d'un texte (journal, site Internet, collègue, supérieur hiérarchique…) qui compare deux points de vue sur un fait de société, exprimés dans deux documents courts (~90 mots chacun), puis prend position sur le thème.",
    twoParts: [
      { p: "1re partie · 40 à 60 mots", d: "Résumez le point de vue des deux documents." },
      { p: "2e partie · 80 à 120 mots", d: "Donnez et argumentez votre propre point de vue sur le sujet." },
    ],
    structureTitle: "La structure",
    steps: [
      { s: "Titre", d: "" },
      { s: "Le point de vue des deux documents", d: "" },
      { s: "Votre point de vue", d: "" },
    ],
    examples: [
      { label: "Résumer les deux documents", quote: "De nos jours, la question de l'utilisation d'Internet par les enfants divise l'opinion publique. Certains pensent que [résumé du document A] l'Internet rend les enfants paresseux et improductifs. À l'inverse, [résumé du document B] d'autres y voient un véritable support de connaissances et de développement de l'imagination." },
      { label: "Introduire votre point de vue", quote: "À ce sujet, il est important de reconnaître qu'il devient aujourd'hui difficile d'appréhender la dynamique des sociétés actuelles en négligeant le rôle d'Internet. Cet outil est devenu incontournable ; c'est pourquoi il faut y associer un contrôle parental pour réguler les heures de connexion et choisir les sites adaptés à l'âge des enfants." },
    ],
  },
];
