export const WRITING_TASKS = [
  { id: 1, t: "Tâche 1 · Message court", words: "60 à 120 mots", min: 15, prompt: "Vous venez d'arriver à Winnipeg. Écrivez un message à votre voisin pour vous présenter et lui demander où faire vos courses dans le quartier.", sample: "Bonjour ! Je m'appelle Sofia et je viens d'emménager au 24, rue Provencher, juste à côté de chez vous. J'arrive de Lisbonne et je découvre encore le quartier. Pourriez-vous me dire où se trouvent une bonne épicerie et une pharmacie près d'ici ? Je cherche aussi un marché pour acheter des produits frais la fin de semaine. Merci beaucoup pour votre aide, et au plaisir de vous rencontrer bientôt ! Sofia" },
  { id: 2, t: "Tâche 2 · Article de blogue", words: "120 à 150 mots", min: 20, prompt: "Vous tenez un blogue sur votre vie au Canada. Racontez votre premier hiver canadien : vos impressions, une anecdote et un conseil pour les nouveaux arrivants.", sample: "Mon premier hiver canadien restera gravé dans ma mémoire. En décembre, le thermomètre est descendu à −28 °C : je n'avais jamais ressenti un froid pareil ! Un matin, j'ai attendu l'autobus quinze minutes sans tuque ; mes oreilles s'en souviennent encore. Pourtant, j'ai vite découvert la magie de cette saison : patiner sur le canal, boire un chocolat chaud après une tempête, admirer la neige qui scintille au soleil. Mon conseil aux nouveaux arrivants ? Investissez dans un vrai manteau d'hiver et de bonnes bottes dès octobre, sans attendre les premières chutes de neige. L'hiver ne se subit pas ici : il se vit. Avec le bon équipement et un peu de curiosité, il devient même la plus belle saison pour découvrir le pays." },
  { id: 3, t: "Tâche 3 · Texte argumenté", words: "120 à 180 mots", min: 25, prompt: "« Le télétravail devrait devenir la norme pour tous les emplois de bureau. » Qu'en pensez-vous ? Défendez votre point de vue à l'aide d'arguments et d'exemples.", sample: "Le télétravail présente des avantages indéniables, mais en faire la norme absolue me semble excessif. D'un côté, travailler de chez soi supprime les déplacements, réduit la pollution et offre une flexibilité précieuse, notamment aux parents. Une amie installée à Halifax économise ainsi dix heures de transport par semaine. De l'autre, le bureau demeure un lieu d'apprentissage et de lien social : les jeunes employés y trouvent des mentors, et bien des idées naissent d'une conversation spontanée. De plus, tous les logements ne permettent pas de travailler dans de bonnes conditions. À mon avis, la solution la plus équilibrée est le modèle hybride : deux ou trois jours à distance, le reste en présence. Chacun profite ainsi de la souplesse du télétravail sans sacrifier la richesse du collectif. Plutôt qu'une norme unique, offrons aux employés un véritable choix." },
];

// Task labels shared by every extracted combination (the three official TCF
// Canada tâches). Combination 0 (the seed set above) keeps its own labels.
const L1 = "Tâche 1 · Message court";
const L2 = "Tâche 2 · Message développé";
const L3 = "Tâche 3 · Texte argumenté";
const W1 = "60 à 120 mots";
const W2 = "120 à 150 mots";
const W3 = "120 à 180 mots";

// Full exam "combinations": one complete subject = the three tâches taken
// together, exactly as they appear on an exam day. The Expression écrite
// section serves ONE whole combination per visit and rotates through them on
// each access (see expressionSessionService). Combination 0 is the original
// built-in set; 1–5 are the real July 2026 subjects (source:
// reussir-tcfcanada.com/juillet-2026-expression-ecrite).
// Tâche 3 subjects give only the debate theme on the source, so they are
// rendered here as an argumentative prompt on that theme.
export const EE_COMBINATIONS = [
  {
    id: "ee-combo-0",
    label: "Sujet A",
    tasks: WRITING_TASKS.map((w) => ({ ...w, id: `ee-c0-t${w.id}`, task: w.id })),
  },
  {
    id: "ee-combo-1",
    label: "Sujet B",
    tasks: [
      { id: "ee-c1-t1", task: 1, t: L1, words: W1, min: 15, sample: "", prompt: "Dans le cadre d'un reportage sur les activités sportives amateurs, France Télévisions souhaite recueillir des témoignages. Et vous, quelle place occupe le sport dans votre vie ? Envoyez votre témoignage sur francetelevision.fr." },
      { id: "ee-c1-t2", task: 2, t: L2, words: W2, min: 20, sample: "", prompt: "Vous avez séjourné dans une magnifique région de votre pays pendant vos vacances. Vous rédigez un message à vos amis dans lequel vous racontez votre séjour et les raisons pour lesquelles cette expérience vous a beaucoup plu." },
      { id: "ee-c1-t3", task: 3, t: L3, words: W3, min: 25, sample: "", prompt: "« École privée : quels enjeux ? » Deux points de vue s'opposent sur la place de l'école privée. Rédigez un texte argumenté dans lequel vous exposez votre opinion, à l'aide d'arguments et d'exemples." },
    ],
  },
  {
    id: "ee-combo-2",
    label: "Sujet C",
    tasks: [
      { id: "ee-c2-t1", task: 1, t: L1, words: W1, min: 15, sample: "", prompt: "Écrivez un message à un(e) ami(e) pour lui raconter votre week-end à la campagne, en détaillant les événements qui se sont déroulés." },
      { id: "ee-c2-t2", task: 2, t: L2, words: W2, min: 20, sample: "", prompt: "Rédigez un message à la direction de votre entreprise pour l'informer qu'un lieu a été trouvé pour la fête de fin d'année. Précisez le lieu, les tarifs, les services proposés et toute autre information pertinente." },
      { id: "ee-c2-t3", task: 3, t: L3, words: W3, min: 25, sample: "", prompt: "« Faut-il utiliser les nouvelles technologies dans les écoles ? » Deux points de vue s'opposent sur cette question. Rédigez un texte argumenté dans lequel vous défendez votre position, à l'aide d'arguments et d'exemples." },
    ],
  },
  {
    id: "ee-combo-3",
    label: "Sujet D",
    tasks: [
      { id: "ee-c3-t1", task: 1, t: L1, words: W1, min: 15, sample: "", prompt: "Un de vos proches souhaite partir en voyage pour découvrir un nouveau pays. Vous lui envoyez un message pour lui présenter votre pays et ses traditions (lieux à visiter, sites touristiques, monuments, etc.)." },
      { id: "ee-c3-t2", task: 2, t: L2, words: W2, min: 20, sample: "", prompt: "Vous avez commencé un nouvel emploi. Vous envoyez un courriel à vos proches pour leur raconter votre première semaine (entreprise, poste, missions, etc.)." },
      { id: "ee-c3-t3", task: 3, t: L3, words: W3, min: 25, sample: "", prompt: "« Femmes et hommes au travail : l'égalité est-elle atteinte ? » Deux points de vue s'opposent sur cette question. Rédigez un texte argumenté dans lequel vous exposez votre opinion, à l'aide d'arguments et d'exemples." },
    ],
  },
  {
    id: "ee-combo-4",
    label: "Sujet E",
    tasks: [
      { id: "ee-c4-t1", task: 1, t: L1, words: W1, min: 15, sample: "", prompt: "Vous recevez ce message d'une amie : « Bonjour, je souhaite commencer le sport dans une salle. Est-ce que tu pourrais me donner des informations sur les salles de sport près de chez nous ? Merci d'avance. Bisous, Laura. » Répondez à Laura pour lui présenter une salle de sport (emplacement, types de cours, tarifs, horaires, etc.)." },
      { id: "ee-c4-t2", task: 2, t: L2, words: W2, min: 20, sample: "", prompt: "Un concours en ligne invite les participants à raconter leur plus belle fête. Vous participez à ce concours. Dans votre texte, vous racontez comment cette fête s'est déroulée (anniversaire, fête culturelle, etc.) et vous précisez ce que vous en retenez." },
      { id: "ee-c4-t3", task: 3, t: L3, words: W3, min: 25, sample: "", prompt: "« Lecture et enfants : faut-il les encourager ou les laisser libres ? » Deux points de vue s'opposent sur la manière de donner aux enfants le goût de la lecture. Rédigez un texte argumenté dans lequel vous défendez votre position, à l'aide d'arguments et d'exemples." },
    ],
  },
  {
    id: "ee-combo-5",
    label: "Sujet F",
    tasks: [
      { id: "ee-c5-t1", task: 1, t: L1, words: W1, min: 15, sample: "", prompt: "Rédigez un message pour convier vos amis à une célébration de fin d'année (date, lieu, programme, etc.)." },
      { id: "ee-c5-t2", task: 2, t: L2, words: W2, min: 20, sample: "", prompt: "Vous avez effectué un séjour au Canada grâce à une agence de voyages. Rédigez un commentaire pour décrire l'expérience que vous avez vécue pendant ce voyage." },
      { id: "ee-c5-t3", task: 3, t: L3, words: W3, min: 25, sample: "", prompt: "« Faut-il interdire les voitures dans les centres-villes ? » Deux points de vue s'opposent sur cette question. Rédigez un texte argumenté dans lequel vous exposez votre opinion, à l'aide d'arguments et d'exemples." },
    ],
  },
];
