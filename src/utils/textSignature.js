// What makes two drafts the SAME text for grading purposes.
//
// Temperature 0 makes an identical text score identically, but a single
// character makes it a different input: deleting one full stop moved a real
// analysis from 11/20 to 10/20. The candidate changed nothing about their
// French and watched their level drop, which reads as the grader being
// arbitrary — and once they think that, no score we give them means anything.
//
// So a re-analysis is only worth spending when the WORDS changed. Punctuation,
// spacing, capitalisation and apostrophe style are normalised away: they are
// real features of a text, but not ones a band boundary should turn on, and
// nothing we can grade at that resolution is defensible.
//
// Deliberately NOT a similarity threshold. "95% the same" would let a whole
// deleted sentence pass as unchanged, and the reused feedback would then quote
// sentences that are no longer in the text. Same words in the same order, or a
// fresh analysis.
export function gradingSignature(text) {
  return String(text || "")
    .toLowerCase()
    // Apostrophes and quotes vary by keyboard and autocorrect; they are not edits.
    .replace(/[’‘`´]/g, "'")
    // Everything that is not a letter, a digit or an apostrophe becomes a gap,
    // so punctuation and line breaks collapse into word boundaries.
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();
}

// True when the only differences are punctuation, spacing or case.
export const sameForGrading = (a, b) => gradingSignature(a) === gradingSignature(b);
