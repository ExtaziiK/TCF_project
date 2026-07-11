// Detailed guides for the two comprehension épreuves (CO, CE), drawn from the
// official France Éducation international candidate manual. Both share one
// page component (pages/GuideComprehension.jsx); each config drives its page.

export const CO_GUIDE = {
  eyebrow: "Guide · Compréhension orale",
  title: "Compréhension orale : comprendre à la première écoute",
  sub: "39 questions à choix multiple en 35 minutes. Chaque enregistrement n'est diffusé qu'une seule fois, et la question arrive après l'écoute.",
  durationLabel: "Durée : 35 min",
  skillsTitle: "Ce que l'épreuve teste",
  skills: [
    "Comprendre des mots familiers et des expressions courantes (dialogues, interviews, appels téléphoniques).",
    "Saisir l'essentiel de messages et d'annonces simples et clairs.",
    "Repérer des informations sur des personnes, des faits ou des événements (radio, télévision).",
    "Suivre des exposés sur des sujets concrets ou abstraits.",
    "Comprendre un discours prononcé à un débit courant.",
  ],
  types: [
    { t: "Une image", d: "Vous écoutez 4 propositions ; choisissez celle qui correspond à l'image affichée." },
    { t: "Une question courte", d: "Vous entendez une question ; choisissez, parmi 4 réponses, celle qui convient." },
    { t: "Un document sonore", d: "Vous écoutez un dialogue ou un extrait, puis une question ; choisissez la bonne réponse." },
  ],
  example: {
    context: "Vous entendez : « — David, pourriez-vous appeler Monsieur Schmit ? J'ai besoin de son avis rapidement. — Oui Madame, je lui propose vendredi prochain ? — Placez-le quand vous voulez, sauf jeudi après-midi : je rencontre un nouveau client. »",
    question: "Que doit faire David ?",
    options: [
      { k: "A", txt: "Annuler une réunion de travail." },
      { k: "B", txt: "Fixer un rendez-vous professionnel." },
      { k: "C", txt: "Passer un entretien d'embauche." },
      { k: "D", txt: "Trouver un nouveau conseiller." },
    ],
    answer: "B",
    note: "La difficulté augmente progressivement au fil de l'épreuve.",
  },
  tipsIntro: "L'audio ne passe qu'une seule fois : la concentration prime.",
  tips: [
    "Écoutez attentivement les consignes et restez concentré tout au long de l'épreuve.",
    "Ne perdez pas de temps à prendre des notes : les questions sont à choix multiple.",
    "Entraînez votre oreille avec la radio et la télévision françaises (RFI, TV5Monde).",
    "Habituez-vous à comprendre un document en une seule écoute.",
  ],
};

export const CE_GUIDE = {
  eyebrow: "Guide · Compréhension écrite",
  title: "Compréhension écrite : lire vite et bien",
  sub: "39 questions à choix multiple en 60 minutes, des documents les plus simples aux textes longs et complexes.",
  durationLabel: "Durée : 60 min",
  skillsTitle: "Ce que l'épreuve teste",
  skills: [
    "Comprendre des mots et des phrases simples (messages, lettres amicales ou administratives).",
    "Trouver des informations dans des documents courants (annonces, prospectus, menus, horaires).",
    "Saisir des informations sur des personnes, des faits ou des événements (lettres personnelles).",
    "Lire des textes en langue courante liés à la vie quotidienne ou au travail.",
    "Comprendre des articles engagés, puis des textes longs, littéraires ou spécialisés.",
  ],
  types: [
    { t: "Un document court", d: "Une affiche, un horaire, une petite annonce : vous repérez une information précise." },
    { t: "Un message ou une lettre", d: "Vous identifiez l'intention ou l'action attendue du destinataire." },
    { t: "Un article", d: "Un texte de presse : vous dégagez l'idée principale ou ce qu'on y apprend." },
  ],
  example: {
    context: "Sur le livret : « Cabinet ouvert du lundi au vendredi, de 8 h 30 à 13 h sur rendez-vous, de 15 h à 18 h sans rendez-vous. Fermé le mercredi matin. »",
    question: "Quand pouvez-vous voir un avocat sans rendez-vous ?",
    options: [
      { k: "A", txt: "En matinée." },
      { k: "B", txt: "À tout moment." },
      { k: "C", txt: "Le samedi." },
      { k: "D", txt: "Dans l'après-midi." },
    ],
    answer: "D",
    note: "La difficulté augmente progressivement ; ne bloquez pas sur une question.",
  },
  tipsIntro: "60 minutes pour 39 questions : la gestion du temps est décisive.",
  tips: [
    "Lisez d'abord la question, puis cherchez l'information dans le document.",
    "Ne restez pas bloqué : la difficulté est progressive, avancez et revenez si besoin.",
    "Méfiez-vous des réponses qui reprennent un mot du texte sans en respecter le sens.",
    "Entraînez-vous à lire des articles de presse français chaque jour.",
  ],
};
