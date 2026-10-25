// « Les familles de mots » — from a word, the form the sentence needs: noun,
// verb, adjective or adverb. Using the right member of a family (décider →
// décision → décisif) is what lets a candidate vary their vocabulary instead of
// repeating one word, and the distractors are the OTHER members of the family,
// so the choice is about grammar, not meaning. The base word is given in
// brackets at the end of the sentence.
//
// { id, sentence (one ___ and the base word), answer, distractors: [3], why, level }

export const FAMILLES = [
  { id: "fm-01", sentence: "Cette ___ a surpris tout le monde. (décider)", answer: "décision", distractors: ["décider", "décisif", "décidément"], why: "Après « cette », il faut un nom féminin : « décision ».", level: "B1" },
  { id: "fm-02", sentence: "Le gouvernement veut ___ l’accès aux soins. (facile)", answer: "faciliter", distractors: ["facile", "facilement", "facilité"], why: "Après « veut », il faut un verbe à l’infinitif : « faciliter ».", level: "B1" },
  { id: "fm-03", sentence: "La ___ des transports en commun a doublé. (fréquent)", answer: "fréquentation", distractors: ["fréquent", "fréquemment", "fréquenter"], why: "Après « la », un nom : « la fréquentation » = le nombre d’usagers.", level: "B2" },
  { id: "fm-04", sentence: "Il a répondu ___ à toutes les questions. (précis)", answer: "précisément", distractors: ["précis", "précision", "préciser"], why: "Pour qualifier le verbe « répondre », un adverbe : « précisément ».", level: "B1" },
  { id: "fm-05", sentence: "Les enfants ont besoin de ___. (sécuriser)", answer: "sécurité", distractors: ["sécuriser", "sécurisé", "sécuritaire"], why: "« Avoir besoin de » + nom : « de sécurité ».", level: "B1" },
  { id: "fm-06", sentence: "Cette mesure est ___ pour l’environnement. (bénéfice)", answer: "bénéfique", distractors: ["bénéfice", "bénéficier", "bénéficiaire"], why: "Après « est », un adjectif : « bénéfique ».", level: "B2" },
  { id: "fm-07", sentence: "L’___ du chômage inquiète les experts. (augmenter)", answer: "augmentation", distractors: ["augmenter", "augmenté", "augmentatif"], why: "Après « l’ », un nom : « l’augmentation ».", level: "B1" },
  { id: "fm-08", sentence: "Il faut ___ les jeunes aux dangers d’Internet. (sensible)", answer: "sensibiliser", distractors: ["sensible", "sensibilité", "sensiblement"], why: "Après « il faut », un verbe : « sensibiliser » = rendre conscient.", level: "B2" },
  { id: "fm-09", sentence: "Sa ___ a impressionné le jury. (créer)", answer: "créativité", distractors: ["créer", "créatif", "créativement"], why: "Après « sa », un nom : « sa créativité ».", level: "B2" },
  { id: "fm-10", sentence: "Les ___ du quartier ont signé une pétition. (habiter)", answer: "habitants", distractors: ["habiter", "habitable", "habituel"], why: "Après « les », un nom de personnes : « les habitants ».", level: "A2" },
  { id: "fm-11", sentence: "Ce produit est ___ pour la santé. (nuire)", answer: "nuisible", distractors: ["nuire", "nuisance", "nuisiblement"], why: "Après « est », un adjectif : « nuisible ».", level: "B2" },
  { id: "fm-12", sentence: "La ___ du quartier a duré dix ans. (rénover)", answer: "rénovation", distractors: ["rénover", "rénové", "rénovateur"], why: "Après « la », un nom féminin : « la rénovation ».", level: "B1" },
  { id: "fm-13", sentence: "Nous devons ___ nos efforts. (intense)", answer: "intensifier", distractors: ["intense", "intensité", "intensément"], why: "Après « devons », un verbe : « intensifier ».", level: "B2" },
  { id: "fm-14", sentence: "Elle parle ___ trois langues. (courant)", answer: "couramment", distractors: ["courant", "courante", "cours"], why: "Pour qualifier le verbe « parler », l’adverbe : « couramment ».", level: "B1" },
  { id: "fm-15", sentence: "L’___ entre les femmes et les hommes progresse. (égal)", answer: "égalité", distractors: ["égal", "également", "égaliser"], why: "Après « l’ », un nom : « l’égalité ».", level: "B1" },
  { id: "fm-16", sentence: "Ce choix est le ___ d’une longue réflexion. (résulter)", answer: "résultat", distractors: ["résulter", "résultant", "résolu"], why: "Après « le », un nom masculin : « le résultat ».", level: "B1" },
  { id: "fm-17", sentence: "Il a agi de manière ___. (responsabilité)", answer: "responsable", distractors: ["responsabilité", "responsabiliser", "responsablement"], why: "« De manière » + adjectif : « de manière responsable ».", level: "B1" },
  { id: "fm-18", sentence: "La ___ de ce projet dépend du budget. (réaliser)", answer: "réalisation", distractors: ["réaliser", "réalisable", "réaliste"], why: "Après « la », un nom : « la réalisation ».", level: "B2" },
  { id: "fm-19", sentence: "Les parents doivent ___ le temps d’écran. (limite)", answer: "limiter", distractors: ["limite", "limitation", "limité"], why: "Après « doivent », un infinitif : « limiter ».", level: "A2" },
  { id: "fm-20", sentence: "Il travaille ___ pour réussir son examen. (sérieux)", answer: "sérieusement", distractors: ["sérieux", "sérieuse", "série"], why: "Pour qualifier le verbe « travailler », l’adverbe : « sérieusement ».", level: "B1" },
];
