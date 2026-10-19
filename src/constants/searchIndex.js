// The staff search box's index (components/layout/SearchOverlay.jsx). Its own
// module because it lists every article and every tense: kept in
// navigation.js, it pulled the full blog and the conjugation bank into the
// first JavaScript file of every visitor, for a box only staff can open.
import { POSTS } from "@/constants/blog";
import { CONJUGATION_TENSES } from "@/constants/conjugation";

export const SEARCH_INDEX = [
  { l: "Tableau de bord", r: "dashboard", c: "Page" },
  { l: "Compréhension orale", r: "listening", c: "Module" },
  { l: "Compréhension écrite", r: "reading", c: "Module" },
  { l: "Expression écrite", r: "writing", c: "Module" },
  { l: "Expression orale", r: "speaking", c: "Module" },
  { l: "La dictée · écrire ce qu'on entend", r: "dictee", c: "Module" },
  { l: "Vocabulaire · cartes mémoire", r: "vocabulary", c: "Module" },
  { l: "Grammaire · le subjonctif", r: "grammar", c: "Leçon" },
  { l: "Grammaire · les articles", r: "grammar", c: "Leçon" },
  // Generated from the bank rather than hand-listed, so a tense added to
  // src/constants/conjugation/ is searchable the day it lands.
  ...CONJUGATION_TENSES.map((tp) => ({ l: `Conjugaison · ${tp.t.toLowerCase()}`, r: "conjugation", c: "Leçon" })),
  { l: "TCF blancs TCF Canada", r: "mocks", c: "Examens" },
  { l: "Sujets EE/EO du mois", r: "sujets-actualite", c: "Ressources" },
  { l: "Anciens sujets · Expression écrite", r: "sujets-ee", c: "Ressources" },
  { l: "Anciens sujets · Expression orale", r: "sujets-eo", c: "Ressources" },
  { l: "Calculateur TCF → NCLC", r: "calculator", c: "Ressources" },
  { l: "Tarifs et abonnements", r: "pricing", c: "Page" },
  { l: "Avis des candidats", r: "avis", c: "Page" },
  { l: "Foire aux questions", r: "faq", c: "Page" },
  // Every article, generated rather than listed: the search box used to carry
  // one hand-written blog entry pointing at the index, so searching for an
  // article's subject found nothing and searching its title landed on a list.
  ...POSTS.map((p) => ({ l: p.t, r: `blog/${p.slug}`, c: "Blog" })),
];
