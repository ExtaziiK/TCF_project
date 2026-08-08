// Holds a grade steady when a revision barely moves it.
//
// The word-level check in textSignature.js stops punctuation from re-grading a
// text at all. This covers what is left: a genuine but tiny edit — one word
// swapped — landing on the other side of a band boundary, so 11/20 B2 becomes
// 10/20 B2, or worse 10 becomes 9 and the level drops a letter. The candidate
// improved something and was told they got worse.
//
// A single point is inside the noise of any human grid too: two TCF raters
// scoring the same script routinely differ by a point. Presenting that
// difference as a change in the candidate's level claims a precision the
// assessment does not have.
//
// So a new score within one point of the previous one is not reported as a
// change: the whole grade is carried over — score, level, NCLC and the
// per-criterion marks, which are the same judgement expressed in more detail
// and would contradict a pinned headline if they moved on their own.
//
// Everything qualitative (summary, strengths, improvements, rewrites, the
// rewritten text) comes from the NEW analysis regardless: the candidate edited
// their text and deserves feedback on what they now have.
export const STICKY_WITHIN = 1;

export function applyStickyScore(previous, next) {
  const before = previous?.score;
  const after = next?.score;
  if (typeof before !== "number" || typeof after !== "number") return next;
  if (Math.abs(after - before) > STICKY_WITHIN) return next;
  if (after === before) return next; // nothing to hold

  return {
    ...next,
    score: before,
    level: previous.level,
    nclc: previous.nclc,
    criteria: previous.criteria ?? next.criteria,
    // Lets the caller explain the hold rather than silently overriding a number
    // the candidate is about to make decisions on.
    scoreHeld: { from: after, to: before },
  };
}
