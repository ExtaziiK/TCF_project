// What counts as a change worth re-grading (src/utils/textSignature.js).
//
// Deleting a single full stop once moved a real analysis from 11/20 to 10/20.
// The candidate had changed nothing about their French, so the grader looked
// arbitrary — and a grader that looks arbitrary makes every score worthless.
//
// The rule these tests pin down: same words in the same order means the same
// text, and the previous analysis stands. Anything else is re-graded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sameForGrading, gradingSignature } from "../src/utils/textSignature.js";

test("punctuation and spacing are not a change", () => {
  // The exact case that prompted this: a trailing full stop removed.
  assert.ok(sameForGrading("Je pense que c'est bien.", "Je pense que c'est bien"));
  assert.ok(sameForGrading("Bonjour,   le monde", "Bonjour le monde"));
  assert.ok(sameForGrading("un texte\n\navec des paragraphes", "un texte avec des paragraphes"));
  assert.ok(sameForGrading("Vraiment ?", "Vraiment?"));
});

test("case and apostrophe style are not a change", () => {
  // Keyboards and autocorrect swap these without the candidate touching a word.
  assert.ok(sameForGrading("L'amitié au travail", "L’amitié au travail"));
  assert.ok(sameForGrading("Pour Conclure", "pour conclure"));
});

test("accents ARE a change", () => {
  // Unlike apostrophe style, an accent is a spelling decision the grid marks.
  assert.ok(!sameForGrading("l'amitie au travail", "l'amitié au travail"));
});

test("any word added, removed or replaced is a change", () => {
  assert.ok(!sameForGrading("Je pense que c'est bien", "Je pense que c'est très bien"));
  assert.ok(!sameForGrading("Je pense que c'est bien", "Je pense que c'est bon"));
  assert.ok(!sameForGrading("une phrase. Une autre phrase.", "une phrase."));
});

test("reordering is a change", () => {
  // Word order carries syntax, which is one of the four graded criteria.
  assert.ok(!sameForGrading("le chat noir", "le noir chat"));
});

test("a deleted sentence never passes as unchanged", () => {
  // The reason this is not a similarity threshold: at 95% similar, a long text
  // could lose a whole sentence and keep its old feedback, which would then
  // quote a sentence no longer there.
  const long = "Aujourd'hui les technologies sont partout dans nos écoles et nos maisons. ".repeat(8);
  assert.ok(!sameForGrading(long + "Mais il faut rester prudent.", long));
});

test("empty and whitespace-only texts collapse to nothing", () => {
  assert.equal(gradingSignature("   \n  "), "");
  assert.equal(gradingSignature(null), "");
});
