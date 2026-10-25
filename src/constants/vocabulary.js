import { IMMIGRATION } from "@/constants/vocab/immigration";
import { TRAVAIL } from "@/constants/vocab/travail";
import { VIE_QUOTIDIENNE } from "@/constants/vocab/vie-quotidienne";
import { ETUDES } from "@/constants/vocab/etudes";
import { ENVIRONNEMENT } from "@/constants/vocab/environnement";
import { SANTE } from "@/constants/vocab/sante";
import { NUMERIQUE } from "@/constants/vocab/numerique";
import { SOCIETE } from "@/constants/vocab/societe";
import { VILLE_LOGEMENT } from "@/constants/vocab/villeLogement";
import { CULTURE_LOISIRS } from "@/constants/vocab/cultureLoisirs";

// One flat bank the UI draws from. Each source file holds ~200 entries
// { fr, def, ex, level } and the category is stamped on here so the per-file
// data stays free of repetition. `level` is the CEFR difficulty (A1 → C2).
const withCat = (cat, list) => list.map((w) => ({ ...w, cat }));

// The last six themes are the recurring Tâche 3 / Tâche 2 subjects of the
// archive (environment, health, screens, society, city and housing, culture),
// weighted towards B2–C1: the words a candidate needs to argue.
// A word listed in two themes is kept once, in the first: cards, favourites
// and « Mon lexique » all key on the word itself.
const seen = new Set();
const once = (list) => list.filter((w) => (seen.has(w.fr) ? false : (seen.add(w.fr), true)));

export const VOCAB = once([
  ...withCat("Immigration", IMMIGRATION),
  ...withCat("Travail", TRAVAIL),
  ...withCat("Vie quotidienne", VIE_QUOTIDIENNE),
  ...withCat("Études", ETUDES),
  ...withCat("Environnement", ENVIRONNEMENT),
  ...withCat("Santé", SANTE),
  ...withCat("Numérique", NUMERIQUE),
  ...withCat("Société", SOCIETE),
  ...withCat("Ville et logement", VILLE_LOGEMENT),
  ...withCat("Culture et loisirs", CULTURE_LOISIRS),
]);

export const VOCAB_CATS = ["Tous", "Immigration", "Travail", "Vie quotidienne", "Études", "Environnement", "Santé", "Numérique", "Société", "Ville et logement", "Culture et loisirs"];
