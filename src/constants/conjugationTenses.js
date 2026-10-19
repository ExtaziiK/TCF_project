// The tenses' ids and titles alone, plus the quiz-key helpers — what the
// dashboard (progressService) and the nav need. The full bank
// (constants/conjugation.js: lessons, tables, ~240 exercises) is only loaded
// by the conjugation page itself. Same order as CONJUGATION_TENSES there;
// tests/conjugation.test.mjs checks the two lists agree.
export const TENSE_LIST = [
  { id: "present", t: "Le présent de l'indicatif" },
  { id: "passe-compose", t: "Le passé composé" },
  { id: "imparfait", t: "L'imparfait" },
  { id: "plus-que-parfait", t: "Le plus-que-parfait" },
  { id: "futur-proche", t: "Le futur proche" },
  { id: "futur-simple", t: "Le futur simple" },
  { id: "conditionnel-present", t: "Le conditionnel présent" },
  { id: "subjonctif-present", t: "Le subjonctif présent" },
  { id: "imperatif", t: "L'impératif" },
];

// The quiz_key recorded in quiz_results. Kept here so the page, the dashboard
// and the progress service all derive it the same way: progressService splits
// conjugation rows out of the exam averages by matching section === "conj",
// and reads the tense back out of this key.
export const CONJ_SECTION = "conj";
export const conjQuizKey = (tenseId) => `conj-${tenseId}`;
export const tenseIdFromQuizKey = (key) => (key || "").replace(/^conj-/, "");
