// Is this text even written in Latin script — the alphabet French uses?
//
// It happens more often than you'd guess: a candidate's system input language
// is set to something else (Arabic, Cyrillic, Urdu…), they type without
// looking closely at what appears, and submit text that is not French in any
// sense a grader — human or AI — can assess. The model usually NOTICES this
// (its own summary correctly says "incompréhensible"), but noticing and
// SCORING it are different skills: asked to place a whole number on a scale
// whose lowest described band is "4-5 A2 isolated sentences", a small model
// tends to reach for a plausible mid-range number instead of the near-zero
// score the text actually deserves. That is what produced a 9/20 "B1, NCLC 6"
// for a paragraph the model's own summary called incomprehensible.
//
// Caught here, deterministically, the same way copiedPrompt.js catches a
// pasted consigne instead of hoping the model spots it every time.
//
// Measured on LETTERS only — punctuation, digits, whitespace and combining
// marks are excluded on both sides — so a French sentence that merely quotes
// a foreign proper noun is never mistaken for wrong-script gibberish.
const isLetter = (ch) => /\p{L}/u.test(ch);
const isLatin = (ch) => /\p{Script=Latin}/u.test(ch);

// Below this many letters there is not enough signal to judge fairly — a
// two-word answer could legitimately be all-Latin and still be wrong for
// reasons the grader is better placed to explain than a script count is.
const MIN_LETTERS = 8;

// Share of the text's letters that are NOT Latin script. Iterated as an array
// of code points (`[...text]`), not `.length`, so a single non-Latin
// character does not get counted as two due to UTF-16 surrogate pairs.
export function nonLatinLetterShare(text) {
  const letters = [...String(text || "")].filter(isLetter);
  if (letters.length < MIN_LETTERS) return 0;
  return letters.filter((ch) => !isLatin(ch)).length / letters.length;
}

// Above this share, the text does not even use the right alphabet — set high
// enough that a French text peppered with a foreign word or two never trips
// it, but low enough that a paragraph typed in the wrong script always does.
export const NOT_LATIN_SCRIPT = 0.5;
