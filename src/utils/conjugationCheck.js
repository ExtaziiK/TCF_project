// Grading for the « Écrire » mode of the conjugation drills.
//
// The rule the tab is built on: a missing accent is WRONG — "j'ai mange" is not
// "j'ai mangé", and the TCF marks it as an error — but it is not the same
// mistake as picking the wrong ending, so it does not deserve the same flat red.
// checkAnswer therefore returns three verdicts, not two:
//
//   "correct"  the form is right
//   "accent"   the right form, spoiled only by accents (still counted wrong,
//              shown in amber with "il manque un accent")
//   "wrong"    a different form
//
// What is forgiven is only what a keyboard does, never what a conjugation does:
// capitalisation (the impératif answers are written "Ferme", typing "ferme" is
// fine), the curly vs straight apostrophe, and stray or doubled spaces. Endings,
// auxiliaries and agreement are never forgiven.

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Case, apostrophe shape and spacing normalised; accents deliberately kept.
// Spaces around an apostrophe go too, so "j' ai mangé" matches "j'ai mangé".
const exactKey = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’‘`]/g, "'")
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, " ");

// The same key with accents removed — what an "accent-only" miss compares on.
const baseKey = (s) => stripAccents(exactKey(s));

// Every spelling accepted in full: the answer plus any declared variants
// (gender forms like "me suis souvenue", tolerated futures like "essayerons").
const accepted = (q) => [q.a, ...(q.alt || [])];

export function checkAnswer(q, typed) {
  const given = exactKey(typed);
  if (!given) return "wrong";
  if (accepted(q).some((form) => exactKey(form) === given)) return "correct";
  if (accepted(q).some((form) => baseKey(form) === baseKey(given))) return "accent";
  return "wrong";
}

// True when the candidate's answer counts toward the score. Only "correct"
// does — "accent" is softer feedback, not a softer mark.
export const isCorrect = (verdict) => verdict === "correct";

// The characters that differ once accents are set aside, e.g. "mange" vs
// "mangé" → "é". Used to name the accent the candidate dropped rather than
// making them diff two near-identical strings by eye.
export function missingAccents(q, typed) {
  const given = exactKey(typed);
  const form = accepted(q).find((f) => baseKey(f) === baseKey(given));
  if (!form) return [];
  const target = exactKey(form);
  const out = [];
  for (let i = 0; i < target.length; i++) {
    if (target[i] !== given[i] && stripAccents(target[i]) !== target[i]) out.push(target[i]);
  }
  return [...new Set(out)];
}

// The full sentence with the gap filled, for the "voici la phrase complète"
// line under the correction. Bare drills have no sentence and return null.
export function filledSentence(q, form = q.a) {
  return q.s ? q.s.replace("___", form) : null;
}
