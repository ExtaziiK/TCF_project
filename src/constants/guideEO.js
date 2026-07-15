// Detailed method for the TCF Canada "Expression orale" épreuve, shown on the
// dedicated guide page (pages/GuideExpressionOrale.jsx) linked from the exam
// guide. A cleaned-up, presentable version of the classic method for the épreuve.

export const EO_INTRO = "L'expression orale dure douze minutes au total, face à un examinateur : c'est un entretien. Vous enchaînez trois exercices, du plus guidé au plus spontané.";

// The three tasks: duration, whether there is preparation, the objective, and
// example prompts the examiner may use.
export const EO_TASKS = [
  {
    n: 1,
    title: "Entretien dirigé",
    time: "≈ 2 min",
    prep: "Sans préparation",
    goal: "Montrer que vous pouvez échanger avec une personne que vous ne connaissez pas. L'examinateur pose des questions simples ; répondez naturellement.",
    prompts: [
      "Pouvez-vous vous présenter, me parler de vous ?",
      "Quel est votre film préféré ? Pourquoi ?",
      "Où êtes-vous allé durant vos dernières vacances ?",
      "Comment imaginez-vous votre vie dans 30 ans ?",
      "Où avez-vous appris le français ?",
    ],
  },
  {
    n: 2,
    title: "Exercice en interaction",
    time: "≈ 5 min 30",
    prep: "Avec préparation",
    goal: "Obtenir une information dans une situation courante de la vie quotidienne. C'est vous qui menez la conversation : pendant la préparation, notez les questions à poser sur le thème imposé.",
    prompts: [
      "Je dirige une association d'aide aux personnes en difficulté. Demandez-moi comment elle fonctionne (actions, financements, adhérents…).",
      "Vous cherchez quelqu'un pour garder votre chat pendant vos vacances ; je propose ma candidature. Posez-moi des questions pour décider (motivation, goûts, personnalité…).",
      "Vous vous interrogez sur les transports en commun en France. Posez-moi toutes vos questions (fréquence, horaires, tarifs…).",
    ],
  },
  {
    n: 3,
    title: "Expression d'un point de vue",
    time: "≈ 4 min 30",
    prep: "Sans préparation",
    goal: "Parler spontanément, de manière continue et convaincante en répondant à une question. Développez vos idées et vos arguments pour convaincre l'examinateur.",
    prompts: [
      "Faut-il, selon vous, interdire la vente d'alcool aux mineurs ?",
      "« Voyager nous rend meilleurs. » Êtes-vous d'accord ? Pourquoi ?",
      "Les moyens de communication ne cessent de se développer : communique-t-on mieux aujourd'hui ?",
    ],
  },
];

export const EO_SCORING = "L'entretien est enregistré, puis évalué conjointement par le centre de passation et par des correcteurs formés par France Éducation international. L'épreuve est notée sur 20, puis traduite en niveaux du CECRL.";

// Score → oral-expression capability on the CECRL scale.
export const EO_LEVELS = [
  { lvl: "A1", d: "Décrire en termes simples son lieu d'habitation et les gens qu'on connaît." },
  { lvl: "A2", d: "Décrire en termes simples des personnes, des conditions de vie, sa formation et son activité professionnelle." },
  { lvl: "B1", d: "Raconter simplement des histoires, expliquer brièvement un projet ou une idée et exprimer ses réactions." },
  { lvl: "B2", d: "S'exprimer de façon claire et détaillée sur une variété de sujets, donner un avis, peser avantages et inconvénients." },
  { lvl: "C1", d: "Présenter de façon détaillée et structurée des sujets complexes et parvenir à une conclusion appropriée." },
  { lvl: "C2", d: "Présenter une argumentation claire et structurée qui met en valeur les points essentiels pour l'interlocuteur." },
];

export const EO_TIPS_INTRO = "C'est une épreuve orale : concentrez vos efforts sur l'écoute et l'expression, avec de petits exercices au quotidien.";

export const EO_TIPS = [
  "Écoutez des radios et télés françaises en variant les thèmes (infos, reportages, films, météo, publicités…) pour côtoyer différents niveaux de langue.",
  "Entraînez-vous peu à peu à regarder des films sans sous-titres.",
  "Exercez-vous à comprendre un document audio en une seule écoute.",
  "Imaginez, puis répondez aux questions qui auraient pu être posées sur ce document.",
  "Pensez en français plutôt que dans votre langue maternelle.",
  "Décrivez mentalement en français ce que vous voyez lors de vos déplacements.",
  "Imaginez une conversation entre les personnages d'une photo.",
  "Apprenez à mémoriser les mots-clés d'un audio plutôt qu'à les noter.",
  "Le jour J, parlez légèrement plus lentement : cela aide à calmer le stress.",
];

export const EO_KNOW = [
  "L'examinateur explique le déroulement en début d'entretien et vérifie que vous l'avez bien compris.",
  "N'hésitez pas à faire répéter une question mal comprise.",
  "Appuyez-vous sur vos expériences personnelles — ou inventez-en — pour étayer vos réponses.",
  "L'examinateur vous interrompt dès que le temps de l'épreuve est écoulé.",
];
