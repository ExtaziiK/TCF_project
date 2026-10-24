// « Le bon connecteur » — choose the connector by the relation it expresses.
//
// The grids score "cohérence" on the linking of ideas, and the classic C1 slip
// is a sophisticated connector used against its meaning (« en revanche » with
// nothing to oppose, « dans la mesure où » as a filler). Each item is a
// sentence with one blank (`___`); the three distractors express a DIFFERENT
// relation, so only one answer is logically possible — and the explanation
// names the relation.
//
// { id, sentence, answer, distractors: [3], relation, why, level }
// An answer ending in an apostrophe (« Bien qu’ ») is glued to the next word.

export const RELATIONS = {
  opposition: "Opposition",
  concession: "Concession",
  cause: "Cause",
  consequence: "Conséquence",
  but: "But",
  condition: "Condition",
  addition: "Ajout",
  illustration: "Exemple",
  conclusion: "Conclusion",
  source: "Source",
  rectification: "Rectification",
};

export const CONNECTEURS = [
  { id: "cx-01", sentence: "Le télétravail fait gagner du temps. ___, il peut isoler les salariés.", answer: "En revanche", distractors: ["Par conséquent", "En effet", "C’est pourquoi"], relation: "opposition", why: "La deuxième phrase présente un inconvénient face à un avantage : c’est une opposition.", level: "B2" },
  { id: "cx-02", sentence: "Les loyers ont fortement augmenté ; ___, de nombreux étudiants vivent chez leurs parents.", answer: "par conséquent", distractors: ["pourtant", "en revanche", "autrement dit"], relation: "consequence", why: "Vivre chez ses parents est le résultat de la hausse des loyers : c’est une conséquence.", level: "B1" },
  { id: "cx-03", sentence: "___ il ait plu toute la journée, le festival a attiré des milliers de visiteurs.", answer: "Bien qu’", distractors: ["Parce qu’", "Puisqu’", "Dès qu’"], relation: "concession", why: "La pluie aurait dû empêcher le succès, mais ne l’a pas fait : concession. « Bien que » est suivi du subjonctif.", level: "B2" },
  { id: "cx-04", sentence: "Je soutiens ce projet ___ il respecte l’environnement.", answer: "dans la mesure où", distractors: ["bien qu’", "alors qu’", "quoiqu’"], relation: "cause", why: "« Dans la mesure où » signifie « puisque, pour autant que » : il justifie le soutien.", level: "C1" },
  { id: "cx-05", sentence: "Les écrans peuvent aider les enfants à apprendre, ___ leur usage reste limité.", answer: "à condition que", distractors: ["parce que", "si bien que", "puisque"], relation: "condition", why: "L’aide des écrans dépend d’une limite : c’est une condition, suivie du subjonctif.", level: "B2" },
  { id: "cx-06", sentence: "Certes, la voiture électrique pollue moins en ville. ___, la fabrication de sa batterie reste coûteuse pour l’environnement.", answer: "Néanmoins", distractors: ["De plus", "Ainsi", "En effet"], relation: "concession", why: "« Certes… néanmoins » : on reconnaît un point, puis on le nuance.", level: "B2" },
  { id: "cx-07", sentence: "Les fast-foods sont pratiques ; ___, ils ne favorisent pas une alimentation équilibrée.", answer: "toutefois", distractors: ["donc", "c’est-à-dire", "de même"], relation: "opposition", why: "Un avantage puis une limite : « toutefois » marque la restriction.", level: "B1" },
  { id: "cx-08", sentence: "Il faut réduire les déchets. ___, chaque citoyen peut utiliser des sacs réutilisables.", answer: "Par exemple", distractors: ["Pourtant", "Bref", "Au contraire"], relation: "illustration", why: "La deuxième phrase illustre concrètement la première.", level: "A2" },
  { id: "cx-09", sentence: "Le premier document défend les zoos, ___ le second les critique sévèrement.", answer: "tandis que", distractors: ["puisque", "afin que", "de sorte que"], relation: "opposition", why: "« Tandis que » oppose deux faits simultanés : idéal pour comparer deux documents.", level: "B2" },
  { id: "cx-10", sentence: "Le prix des transports en commun a baissé, ___ leur fréquentation a doublé.", answer: "si bien que", distractors: ["bien que", "alors même que", "pour que"], relation: "consequence", why: "La fréquentation a doublé à cause de la baisse : « si bien que » introduit la conséquence, à l’indicatif.", level: "B2" },
  { id: "cx-11", sentence: "Les enfants doivent lire davantage ___ développer leur vocabulaire.", answer: "afin de", distractors: ["à cause de", "malgré", "au lieu de"], relation: "but", why: "Développer le vocabulaire est l’objectif : « afin de » + infinitif exprime le but.", level: "B1" },
  { id: "cx-12", sentence: "___ son jeune âge, elle dirige déjà une équipe de vingt personnes.", answer: "Malgré", distractors: ["Grâce à", "À cause de", "Selon"], relation: "concession", why: "Le jeune âge aurait pu être un obstacle : « malgré » + nom exprime la concession.", level: "B1" },
  { id: "cx-13", sentence: "Le projet a été abandonné ___ financement.", answer: "faute de", distractors: ["en dépit du", "grâce au", "au lieu du"], relation: "cause", why: "« Faute de » exprime une cause par manque : il n’y avait pas de financement.", level: "C1" },
  { id: "cx-14", sentence: "Les zoos protègent certaines espèces. ___, ils participent à l’éducation du public.", answer: "En outre", distractors: ["Cependant", "Par contre", "Sinon"], relation: "addition", why: "On ajoute un deuxième argument dans le même sens : « en outre ».", level: "B2" },
  { id: "cx-15", sentence: "Il faut agir rapidement ; ___, la situation risque de s’aggraver.", answer: "sinon", distractors: ["ainsi", "de plus", "néanmoins"], relation: "condition", why: "« Sinon » = si on n’agit pas : il introduit la conséquence de l’hypothèse contraire.", level: "B1" },
  { id: "cx-16", sentence: "___ les études le montrent, l’activité physique améliore la concentration.", answer: "Comme", distractors: ["Bien que", "Même si", "Pour que"], relation: "source", why: "« Comme les études le montrent » appuie l’idée sur une source.", level: "B1" },
  { id: "cx-17", sentence: "Cette réforme est utile ; ___, elle arrive bien trop tard.", answer: "cependant", distractors: ["en effet", "donc", "notamment"], relation: "opposition", why: "Un point positif, puis une réserve : « cependant ».", level: "B1" },
  { id: "cx-18", sentence: "Les jeunes lisent moins de livres. ___, ils n’ont pas arrêté de lire : ils lisent beaucoup sur écran.", answer: "Pour autant", distractors: ["C’est pourquoi", "Ainsi", "De ce fait"], relation: "concession", why: "« Pour autant » = malgré cela, on ne peut pas en conclure que… : une concession de niveau C1.", level: "C1" },
  { id: "cx-19", sentence: "___ le premier document, la publicité influence fortement les enfants.", answer: "Selon", distractors: ["Malgré", "Grâce à", "Au lieu de"], relation: "source", why: "« Selon » attribue l’idée à sa source : indispensable dans la synthèse de la tâche 3.", level: "A2" },
  { id: "cx-20", sentence: "Je voterai pour ce projet ___ la mairie en garantisse le financement.", answer: "pourvu que", distractors: ["parce que", "alors que", "puisque"], relation: "condition", why: "« Pourvu que » pose une condition et appelle le subjonctif (« garantisse »).", level: "C1" },
  { id: "cx-21", sentence: "Il ne s’agit pas d’interdire les écrans, ___ d’en encadrer l’usage.", answer: "mais plutôt", distractors: ["et donc", "ou bien", "car"], relation: "rectification", why: "« Il ne s’agit pas de… mais plutôt de… » corrige une idée par une autre.", level: "B2" },
  { id: "cx-22", sentence: "La colocation coûte moins cher ; ___, elle permet de rencontrer du monde.", answer: "de surcroît", distractors: ["néanmoins", "pourtant", "au contraire"], relation: "addition", why: "Deux avantages : « de surcroît » ajoute le second, dans un registre soutenu.", level: "C1" },
  { id: "cx-23", sentence: "Les inscriptions sont gratuites, ___ les places sont limitées.", answer: "mais", distractors: ["car", "donc", "puisque"], relation: "opposition", why: "Un avantage, puis une restriction : « mais ».", level: "A2" },
  { id: "cx-24", sentence: "On l’a embauché ___ son expérience à l’étranger.", answer: "en raison de", distractors: ["malgré", "afin de", "au lieu de"], relation: "cause", why: "L’expérience est la raison de l’embauche : « en raison de » + nom.", level: "B2" },
  { id: "cx-25", sentence: "___ de nombreux efforts, les résultats restent décevants.", answer: "En dépit de", distractors: ["Grâce à", "À la suite de", "En raison de"], relation: "concession", why: "Les efforts auraient dû payer : « en dépit de » = malgré, plus soutenu.", level: "C1" },
  { id: "cx-26", sentence: "Les distributeurs sont pratiques ; ___, ils encouragent la consommation de sucre.", answer: "pourtant", distractors: ["c’est pourquoi", "en effet", "ainsi"], relation: "opposition", why: "Un avantage, puis un effet contraire inattendu : « pourtant ».", level: "B1" },
  { id: "cx-27", sentence: "La ville a fermé le centre aux voitures ___ réduire la pollution.", answer: "dans le but de", distractors: ["à force de", "au lieu de", "faute de"], relation: "but", why: "« Dans le but de » exprime l’objectif de la mesure.", level: "B1" },
  { id: "cx-28", sentence: "Il faudrait investir dans les transports publics ___ les habitants puissent se passer de leur voiture.", answer: "pour que", distractors: ["parce que", "tandis que", "dès que"], relation: "but", why: "Le but de l’investissement : « pour que » + subjonctif (« puissent »).", level: "B1" },
  { id: "cx-29", sentence: "Le télétravail présente des avantages ; ___ il ne convient pas à tous les métiers.", answer: "il n’en reste pas moins qu’", distractors: ["c’est pourquoi", "en effet,", "autrement dit,"], relation: "concession", why: "« Il n’en reste pas moins que » = malgré cela, c’est vrai : une concession soutenue.", level: "C1" },
  { id: "cx-30", sentence: "Il a raté son train ; ___, il est arrivé en retard à l’entretien.", answer: "de ce fait", distractors: ["malgré cela", "au contraire", "néanmoins"], relation: "consequence", why: "Le retard découle du train raté : « de ce fait » introduit la conséquence.", level: "B2" },
  { id: "cx-31", sentence: "___, je pense que les avantages l’emportent sur les inconvénients.", answer: "En définitive", distractors: ["Par exemple", "D’une part", "Au contraire"], relation: "conclusion", why: "« En définitive » annonce la conclusion de l’argumentation.", level: "B2" },
  { id: "cx-32", sentence: "___ certains y voient un progrès, d’autres dénoncent une atteinte à la vie privée.", answer: "Si", distractors: ["Puisque", "Comme", "Parce que"], relation: "opposition", why: "« Si… d’autres… » oppose deux points de vue : ce « si » n’est pas une condition.", level: "C1" },
  { id: "cx-33", sentence: "Les élèves portent l’uniforme ; ___, les différences sociales se voient moins.", answer: "ainsi", distractors: ["toutefois", "or", "sinon"], relation: "consequence", why: "Les différences se voient moins grâce à l’uniforme : « ainsi » marque la conséquence.", level: "B1" },
  { id: "cx-34", sentence: "Le second document, ___, met en avant les dangers des écrans.", answer: "quant à lui", distractors: ["par exemple", "en conséquence", "de plus"], relation: "opposition", why: "« Quant à lui » oppose le second document au premier : très utile pour une synthèse.", level: "C1" },
  { id: "cx-35", sentence: "Il faut réduire la viande, ___ la supprimer complètement.", answer: "sans pour autant", distractors: ["afin de", "à force de", "grâce à"], relation: "rectification", why: "« Sans pour autant » limite la portée de la recommandation : réduire, oui ; supprimer, non.", level: "C1" },
  { id: "cx-36", sentence: "Les loyers augmentent ; ___, les salaires stagnent.", answer: "or", distractors: ["donc", "car", "ainsi"], relation: "opposition", why: "« Or » introduit un fait qui pèse contre le précédent et fait avancer le raisonnement.", level: "C1" },
  { id: "cx-37", sentence: "___ d’interdire les fast-foods, il vaudrait mieux éduquer les consommateurs.", answer: "Plutôt que", distractors: ["Afin", "À force", "En plus"], relation: "rectification", why: "« Plutôt que de… » écarte une solution pour en proposer une autre.", level: "B2" },
  { id: "cx-38", sentence: "L’association a reçu une subvention ; ___, elle pourra ouvrir un second local.", answer: "dès lors", distractors: ["pourtant", "en revanche", "toutefois"], relation: "consequence", why: "La subvention rend possible l’ouverture : « dès lors » = par conséquent, soutenu.", level: "C1" },
  { id: "cx-39", sentence: "Les deux documents s’accordent sur un point : la lecture est essentielle. ___, ils divergent sur la manière d’y amener les enfants.", answer: "En revanche", distractors: ["De même", "Ainsi", "En effet"], relation: "opposition", why: "Un accord, puis un désaccord : « en revanche » oppose les deux.", level: "B2" },
  { id: "cx-40", sentence: "Je préfère voyager seul ___ je peux choisir mes activités.", answer: "puisque", distractors: ["bien que", "pour que", "alors que"], relation: "cause", why: "Choisir ses activités est la raison de la préférence : « puisque » introduit une cause évidente.", level: "B1" },
];
