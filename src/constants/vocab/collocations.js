// « Les collocations » — the verb that goes with the noun. "Faire une décision"
// is understood but marks a B1 text; "prendre une décision" is what a native
// writes. Every item was chosen so that only ONE verb is correct French: pairs
// where two verbs are both right (faire / commettre une erreur, donner / émettre
// un avis…) were left out on purpose.
//
// { id, sentence (one ___), answer, distractors: [3], why, level }

export const COLLOCATIONS = [
  { id: "co-01", sentence: "Le gouvernement a ___ une décision difficile.", answer: "pris", distractors: ["fait", "donné", "mis"], why: "On « prend » une décision ; « faire une décision » est un calque de l’anglais.", level: "B1" },
  { id: "co-02", sentence: "Il faut ___ des mesures contre le gaspillage.", answer: "prendre", distractors: ["faire", "mettre", "donner"], why: "On « prend des mesures » (ou on les « met en place »).", level: "B1" },
  { id: "co-03", sentence: "Cette entreprise a ___ face à une grave crise.", answer: "fait", distractors: ["pris", "mis", "eu"], why: "L’expression est « faire face à » : affronter une difficulté.", level: "B2" },
  { id: "co-04", sentence: "Le maire a ___ en place un nouveau service de navettes.", answer: "mis", distractors: ["fait", "pris", "donné"], why: "« Mettre en place » = organiser, installer un dispositif.", level: "B1" },
  { id: "co-05", sentence: "Le suspect a ___ un délit grave.", answer: "commis", distractors: ["fait", "mis", "joué"], why: "On « commet » un délit, un crime, une infraction.", level: "B2" },
  { id: "co-06", sentence: "Ce projet a ___ de vives critiques.", answer: "suscité", distractors: ["donné", "fait", "mis"], why: "« Susciter des critiques » = les faire naître.", level: "C1" },
  { id: "co-07", sentence: "Ce médicament peut ___ des effets secondaires.", answer: "entraîner", distractors: ["faire", "mettre", "prendre"], why: "« Entraîner » = avoir pour conséquence.", level: "B2" },
  { id: "co-08", sentence: "Le chômage des jeunes a ___ un niveau record.", answer: "atteint", distractors: ["fait", "pris", "eu"], why: "Un chiffre « atteint » un niveau.", level: "B1" },
  { id: "co-09", sentence: "Les villes doivent ___ un rôle dans la lutte contre le climat.", answer: "jouer", distractors: ["faire", "mettre", "donner"], why: "On « joue un rôle » dans quelque chose.", level: "B1" },
  { id: "co-10", sentence: "Si vous avez un doute, n’hésitez pas à ___ une question.", answer: "poser", distractors: ["faire", "mettre", "donner"], why: "On « pose » une question ; « faire une question » est une erreur fréquente.", level: "A2" },
  { id: "co-11", sentence: "J’ai ___ rendez-vous chez le dentiste pour lundi.", answer: "pris", distractors: ["fait", "mis", "donné"], why: "On « prend rendez-vous » ; « faire un rendez-vous » est un calque.", level: "A2" },
  { id: "co-12", sentence: "Il a toujours ___ ses promesses.", answer: "tenu", distractors: ["gardé", "fait", "pris"], why: "On « tient » ses promesses ; « garder sa promesse » vient de l’anglais.", level: "B2" },
  { id: "co-13", sentence: "Le gouvernement veut ___ fin à cette pratique.", answer: "mettre", distractors: ["donner", "faire", "prendre"], why: "« Mettre fin à » = arrêter définitivement.", level: "B2" },
  { id: "co-14", sentence: "Elle a décidé de ___ plainte contre son voisin.", answer: "porter", distractors: ["faire", "mettre", "donner"], why: "On « porte plainte » auprès de la police.", level: "B2" },
  { id: "co-15", sentence: "Nous ___ visite à nos grands-parents chaque dimanche.", answer: "rendons", distractors: ["faisons", "donnons", "visitons"], why: "On « rend visite à » une personne ; on « visite » un lieu.", level: "B1" },
  { id: "co-16", sentence: "Les jeunes ont ___ conscience de l’urgence climatique.", answer: "pris", distractors: ["fait", "mis", "donné"], why: "« Prendre conscience de » = se rendre compte de.", level: "B2" },
  { id: "co-17", sentence: "Il faut ___ les leçons de cette crise.", answer: "tirer", distractors: ["faire", "donner", "prendre"], why: "On « tire les leçons » d’un événement ; « prendre des leçons », c’est suivre des cours.", level: "C1" },
  { id: "co-18", sentence: "Elle a ___ le défi avec brio.", answer: "relevé", distractors: ["fait", "pris", "gagné"], why: "On « relève » un défi ; « prendre un défi » est un anglicisme.", level: "C1" },
  { id: "co-19", sentence: "Cette formation lui a permis de ___ ses lacunes.", answer: "combler", distractors: ["remplir", "fermer", "faire"], why: "On « comble » des lacunes, un manque, un retard.", level: "C1" },
  { id: "co-20", sentence: "Le bénévolat permet de ___ des liens avec d’autres habitants.", answer: "nouer", distractors: ["faire", "mettre", "donner"], why: "On « noue » des liens, des relations.", level: "C1" },
  { id: "co-21", sentence: "Il faut ___ compte des besoins des personnes âgées.", answer: "tenir", distractors: ["prendre", "faire", "donner"], why: "On dit « tenir compte de » ou « prendre en compte » — jamais « prendre compte de ».", level: "B2" },
  { id: "co-22", sentence: "Le comité a ___ un avis favorable.", answer: "émis", distractors: ["fait", "mis", "pris"], why: "Une instance « émet » un avis, une hypothèse, une réserve.", level: "C1" },
  { id: "co-23", sentence: "Les parents ___ une grande importance aux études.", answer: "accordent", distractors: ["font", "mettent", "prennent"], why: "On « accorde » de l’importance à quelque chose.", level: "B2" },
  { id: "co-24", sentence: "Le parlement a ___ une nouvelle loi sur le logement.", answer: "adopté", distractors: ["fait", "pris", "mis"], why: "Un parlement « adopte » (ou « vote ») une loi.", level: "B2" },
  { id: "co-25", sentence: "La mairie a ___ une campagne de sensibilisation.", answer: "lancé", distractors: ["jeté", "pris", "donné"], why: "On « lance » une campagne, un projet, un appel.", level: "B1" },
  { id: "co-26", sentence: "La maison a ___ de gros dégâts pendant la tempête.", answer: "subi", distractors: ["fait", "pris", "donné"], why: "On « subit » des dégâts, des pertes, des critiques.", level: "B2" },
  { id: "co-27", sentence: "Vous devez ___ ce formulaire avant lundi.", answer: "remplir", distractors: ["combler", "garnir", "faire"], why: "On « remplit » un formulaire ; on « comble » une lacune.", level: "A2" },
  { id: "co-28", sentence: "Nous avons ___ la queue pendant une heure.", answer: "fait", distractors: ["pris", "tenu", "mis"], why: "L’expression est « faire la queue ».", level: "A2" },
  { id: "co-29", sentence: "Le maire a ___ la parole en premier.", answer: "pris", distractors: ["fait", "mis", "tenu"], why: "On « prend la parole » pour parler devant un public.", level: "B1" },
  { id: "co-30", sentence: "Il a ___ preuve de beaucoup de patience.", answer: "fait", distractors: ["donné", "pris", "mis"], why: "« Faire preuve de » = montrer une qualité.", level: "B2" },
  { id: "co-31", sentence: "Le coach nous a ___ un objectif ambitieux.", answer: "fixé", distractors: ["mis", "pris", "fait"], why: "On « fixe » un objectif, une date, un prix.", level: "B2" },
  { id: "co-32", sentence: "Peux-tu me ___ service ce week-end ?", answer: "rendre", distractors: ["faire", "donner", "prêter"], why: "L’expression est « rendre service ».", level: "B1" },
  { id: "co-33", sentence: "Ses efforts ont fini par ___ leurs fruits.", answer: "porter", distractors: ["faire", "prendre", "rendre"], why: "Des efforts « portent leurs fruits » : ils donnent des résultats.", level: "C1" },
];
