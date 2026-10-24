// Which vocabulary themes a writing subject belongs to — for the workshop's
// « Vocabulaire utile pour ce sujet » panel. Keyword matching on the consigne
// (and, for tâche 3, the documents), accent-insensitive; a theme scores one
// point per keyword found. Pure: tests/vocab-deck.test.mjs.

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const THEME_KEYWORDS = {
  Environnement: ["environnement", "ecolog", "pollu", "climat", "zoo", "animal", "animaux", "nature", "dechet", "recycl", "plastique", "velo", "voiture", "energie", "chasse", "bio", "fait maison", "faits maison", "transports en commun", "carbone"],
  Santé: ["sante", "alimentation", "manger", "viande", "fast-food", "restauration rapide", "sport", "medecin", "hopital", "maladie", "obesite", "sucre", "distributeur", "retraite", "personne agee", "aines", "salle de sport", "bien-etre"],
  Numérique: ["numerique", "ecran", "internet", "en ligne", "jeux video", "jeu video", "reseaux sociaux", "technologie", "tablette", "ordinateur", "telephone", "teletravail", "a distance", "application", "smartphone"],
  Société: ["societe", "egalite", "parite", "femme", "homme", "pauvre", "sans-abri", "solidarite", "benevol", "publicite", "consommation", "enfant", "parent", "education", "ecole privee", "uniforme", "generation", "rigueur", "discrimination", "art urbain", "graffiti"],
  "Ville et logement": ["logement", "appartement", "colocation", "colocataire", "loyer", "quartier", "ville", "voisin", "maison", "demenag", "emmenag", "chez ses parents", "transport", "centre-ville", "gratuit", "parking", "rue"],
  "Culture et loisirs": ["festival", "concert", "spectacle", "theatre", "film", "cinema", "musee", "exposition", "restaurant", "fete", "vacances", "voyage", "sejour", "artiste", "chanteur", "livre", "lecture", "loisir", "gastronom", "semaine du gout", "pique-nique", "anniversaire", "mariage"],
  Travail: ["travail", "emploi", "poste", "collegue", "entreprise", "metier", "salarie", "embauche", "formation professionnelle", "stage", "mission", "direction", "patron", "reunion"],
  Études: ["etude", "etudiant", "universite", "cours", "langue", "apprentissage", "apprendre", "examen", "diplome", "lycee", "college", "eleve", "professeur", "formation"],
  Immigration: ["immigr", "pays", "etranger", "canada", "quebec", "arriver", "installer", "nouvelle ville", "visa", "citoyen", "integration"],
};

// → the matching themes, best first (at most `max`), or [] when nothing matches.
// A keyword counts only at the start of a word: « velo » must not match
// « dé-velo-ppent », nor « rue » « c-rue-l ».
// (Keywords are letters, spaces and hyphens only: nothing to escape.)
const startsWord = (hay, kw) => new RegExp(`(^|[^a-z])${kw}`).test(hay);

export function themesFor(text, max = 2) {
  const hay = norm(text);
  return Object.entries(THEME_KEYWORDS)
    .map(([theme, words]) => [theme, words.filter((w) => startsWord(hay, w)).length])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([theme]) => theme);
}

// The words to suggest for a subject: from its themes, the most useful levels
// first (C1, B2, then B1), in a stable order so the panel does not reshuffle.
const LEVEL_RANK = { C1: 0, B2: 1, B1: 2, C2: 3, A2: 4, A1: 5 };
export function wordsForSubject(text, vocab, count = 10) {
  const themes = themesFor(text);
  if (!themes.length) return { themes, words: [] };
  // Within a theme, the words that share something with THIS subject come
  // first (a zoo subject wants « la captivité » before « la mobilité douce »):
  // one point per word of five letters or more found in the entry's word,
  // definition or example. Level breaks the ties.
  // Stems, so « animaux » finds « animal » and « zoos » finds « zoo »; the
  // words every consigne contains are left out.
  const STOP = new Set(["dans", "pour", "avec", "sont", "leur", "leurs", "cette", "entre", "vous", "nous", "votre", "document", "documents", "avantages", "inconvenients", "contre", "points", "opinion", "opinions", "theme", "general", "propres", "parties", "partie", "premiere", "deuxieme", "comparez", "donnez", "position", "texte", "mots", "elle", "ils", "elles", "plus", "moins", "tres", "aussi", "mais", "comme", "ainsi"]);
  const stem = (wd) => (wd.length > 5 ? wd.slice(0, 5) : wd.replace(/[sx]$/, ""));
  const tokens = [...new Set((norm(text).match(/[a-z]{4,}/g) || []).filter((wd) => !STOP.has(wd)).map(stem))];
  const relevance = (w) => {
    const hay = norm(`${w.fr} ${w.def} ${w.ex}`);
    return tokens.filter((tk) => hay.includes(tk)).length;
  };
  const ranked = (theme) => vocab
    .filter((w) => w.cat === theme)
    .map((w) => ({ w, r: relevance(w) }))
    .sort((a, b) => (b.r - a.r) || ((LEVEL_RANK[a.w.level] ?? 9) - (LEVEL_RANK[b.w.level] ?? 9)))
    .map((x) => x.w);
  // The main theme gives most of the list; a second one, when there is one,
  // tops it up — a subject about screens at school needs both.
  const firstShare = themes.length > 1 ? Math.ceil(count * 0.7) : count;
  const words = [...ranked(themes[0]).slice(0, firstShare), ...(themes[1] ? ranked(themes[1]).slice(0, count - firstShare) : [])];
  return { themes, words };
}
