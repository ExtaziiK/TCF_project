// Grade stickiness (src/utils/stickyScore.js).
//
// textSignature stops punctuation re-grading a text at all. This covers what
// remains: a real but tiny edit crossing a band boundary, so a candidate who
// improved one word is told their level dropped. Two human TCF raters routinely
// differ by a point on the same script, so presenting a one-point move as a
// change claims a precision the assessment does not have.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyStickyScore } from "../src/utils/stickyScore.js";

const grade = (score, level, nclc, extra = {}) => ({
  score, level, nclc, criteria: { lexique: score }, summary: `s${score}`, rewrites: [], ...extra,
});

test("a one-point drop is held, and the whole grade travels together", () => {
  const held = applyStickyScore(grade(11, "B2", 7), grade(10, "B2", 7));
  assert.equal(held.score, 11);
  assert.equal(held.level, "B2");
  assert.equal(held.nclc, 7);
  // The per-criterion marks are the same judgement in more detail: letting them
  // move under a pinned headline would have the card contradict itself.
  assert.deepEqual(held.criteria, { lexique: 11 });
  assert.deepEqual(held.scoreHeld, { from: 10, to: 11 });
});

test("a one-point rise is held too", () => {
  // Symmetric on purpose: a grade that only ever ratchets upward would drift
  // with each re-press and stop meaning anything.
  const held = applyStickyScore(grade(10, "B2", 7), grade(11, "B2", 7));
  assert.equal(held.score, 10);
  assert.deepEqual(held.scoreHeld, { from: 11, to: 10 });
});

test("the level follows the held score across a band boundary", () => {
  // 10 is B2, 9 is B1. This is the case that stings: one word edited, and the
  // candidate is told they fell a CEFR level.
  const held = applyStickyScore(grade(10, "B2", 7), grade(9, "B1", 6));
  assert.equal(held.score, 10);
  assert.equal(held.level, "B2");
  assert.equal(held.nclc, 7);
});

test("a two-point move is a real change and passes through", () => {
  const out = applyStickyScore(grade(10, "B2", 7), grade(12, "B2", 8));
  assert.equal(out.score, 12);
  assert.equal(out.nclc, 8);
  assert.equal(out.scoreHeld, undefined, "an honest change must not be announced as held");
});

test("an identical score is not reported as held", () => {
  const out = applyStickyScore(grade(11, "B2", 7), grade(11, "B2", 7));
  assert.equal(out.scoreHeld, undefined);
});

test("the qualitative feedback is always the NEW one", () => {
  // The candidate edited their text; the advice must describe what they now
  // have, even when the grade does not move.
  const held = applyStickyScore(grade(11, "B2", 7, { summary: "ancien" }), grade(10, "B2", 7, { summary: "nouveau" }));
  assert.equal(held.summary, "nouveau");
});

test("a first analysis has nothing to hold against", () => {
  const out = applyStickyScore(null, grade(9, "B1", 6));
  assert.equal(out.score, 9);
  assert.equal(out.scoreHeld, undefined);
});

test("a missing score is passed through untouched", () => {
  // The oral endpoint can return feedback with no score at all.
  const out = applyStickyScore(grade(11, "B2", 7), { summary: "pas de note" });
  assert.equal(out.summary, "pas de note");
  assert.equal(out.score, undefined);
});
