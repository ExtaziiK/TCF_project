import { PRESENT } from "@/constants/conjugation/present";
import { PASSE_COMPOSE } from "@/constants/conjugation/passe-compose";
import { IMPARFAIT } from "@/constants/conjugation/imparfait";
import { FUTUR_PROCHE } from "@/constants/conjugation/futur-proche";
import { FUTUR_SIMPLE } from "@/constants/conjugation/futur-simple";
import { PLUS_QUE_PARFAIT } from "@/constants/conjugation/plus-que-parfait";
import { CONDITIONNEL_PRESENT } from "@/constants/conjugation/conditionnel-present";
import { SUBJONCTIF_PRESENT } from "@/constants/conjugation/subjonctif-present";
import { IMPERATIF } from "@/constants/conjugation/imperatif";

// Conjugation lessons + exercises, one file per tense (same split as
// src/constants/vocab/*.js). The page lets a candidate pick a temps, read its
// lesson, then drill it either by typing the form or by choosing from a list.
//
// Each tense is:
//   id        route-safe slug, also the quiz_key suffix recorded in quiz_results
//   t, d      title and one-line description
//   level     CEFR level the tense is expected at
//   use       one sentence: when this tense is used
//   lesson[]  the rule, as numbered bullets
//   tables[]  { verb, note, forms[], labels? } — a full paradigm. `forms` is
//             index-aligned with `labels`, which defaults to PRONOUN_LABELS;
//             l'impératif overrides it because it only has three persons.
//   irregulars[] { v, f } — the forms that must simply be memorised
//   qs[]      the exercise bank (see below)
//
// An exercise is:
//   s     the sentence, with "___" where the verb goes. OMITTED for a bare
//         drill, which shows "infinitif · pronom → ?" instead.
//   inf   the infinitive, shown as the hint next to the gap
//   p     the subject pronoun the answer must agree with
//   a     the expected answer — exactly what the candidate types, which for a
//         compound tense is the WHOLE verb group ("sommes allés")
//   alt[] other answers accepted in full (gender variants, tolerated spellings)
//   opts[] four choices for « Choisir » mode; `a` must be one of them
//   exp   why that answer is right — shown after every attempt
//
// The invariants above (four distinct options, `a` among them, a gap in every
// `s`) are enforced by tests/conjugation.test.mjs, not by hand.
// Ordered as a course, not alphabetically: the présent first, then the three
// pasts in the order a candidate meets them, then the futures, then the two
// moods. The grid numbers the cards from this array, so reordering it
// reorders the page.
export const CONJUGATION_TENSES = [
  PRESENT,
  PASSE_COMPOSE,
  IMPARFAIT,
  PLUS_QUE_PARFAIT,
  FUTUR_PROCHE,
  FUTUR_SIMPLE,
  CONDITIONNEL_PRESENT,
  SUBJONCTIF_PRESENT,
  IMPERATIF,
];

// Row labels for a `tables[].forms` array, unless the table overrides them.
export const PRONOUN_LABELS = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];

export const findTense = (id) => CONJUGATION_TENSES.find((x) => x.id === id) || null;

// Every exercise, stamped with the tense it came from — the pool the global
// "Mode quiz" draws from.
export const ALL_CONJUGATION_QS = CONJUGATION_TENSES.flatMap((tense) =>
  tense.qs.map((q) => ({ ...q, tense: tense.t, tenseId: tense.id })),
);

// The quiz_key recorded in quiz_results. Kept here so the page, the dashboard
// and the progress service all derive it the same way: progressService splits
// conjugation rows out of the exam averages by matching section === "conj",
// and reads the tense back out of this key.
export const CONJ_SECTION = "conj";
export const conjQuizKey = (tenseId) => `conj-${tenseId}`;
export const tenseIdFromQuizKey = (key) => (key || "").replace(/^conj-/, "");
