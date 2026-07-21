import { IMMIGRATION } from "@/constants/vocab/immigration";
import { TRAVAIL } from "@/constants/vocab/travail";
import { VIE_QUOTIDIENNE } from "@/constants/vocab/vie-quotidienne";
import { ETUDES } from "@/constants/vocab/etudes";

// One flat bank the UI draws from. Each source file holds ~200 entries
// { fr, def, ex, level } and the category is stamped on here so the per-file
// data stays free of repetition. `level` is the CEFR difficulty (A1 → C2).
const withCat = (cat, list) => list.map((w) => ({ ...w, cat }));

export const VOCAB = [
  ...withCat("Immigration", IMMIGRATION),
  ...withCat("Travail", TRAVAIL),
  ...withCat("Vie quotidienne", VIE_QUOTIDIENNE),
  ...withCat("Études", ETUDES),
];

export const VOCAB_CATS = ["Tous", "Immigration", "Travail", "Vie quotidienne", "Études"];
