// Sentence splitting for the dictée (api/_lib/dictee.js).
//
// Each sentence becomes one recording and one thing a candidate types from
// memory, so the split decides how hard the exercise is. Two failure modes
// matter: a fragment too short to be worth listening to, and a sentence so long
// that the exercise measures short-term memory instead of French. The generator
// is instructed to stay in range; these are the guards for when it doesn't.

import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSentences } from "../api/_lib/dictee.js";

const words = (s) => (s.match(/[\p{L}\p{N}]+/gu) || []).length;

test("splits on sentence terminators", () => {
  const out = splitSentences("La ville a beaucoup changé cette année. Les habitants sont plus nombreux qu'avant. Le maire annonce un nouveau plan.");
  assert.equal(out.length, 3);
  assert.equal(out[0], "La ville a beaucoup changé cette année.");
  assert.equal(out[2], "Le maire annonce un nouveau plan.");
});

test("keeps question and exclamation marks with their sentence", () => {
  const out = splitSentences("Faut-il vraiment encadrer la publicité destinée aux enfants ? La question mérite d'être posée sérieusement.");
  assert.equal(out.length, 2);
  assert.ok(out[0].endsWith("?"));
});

test("a fragment too short to dictate is glued to the sentence before it", () => {
  const out = splitSentences("Les études le montrent clairement depuis plusieurs années. Bien sûr. Il faut donc agir sans attendre davantage.");
  assert.equal(out.length, 2);
  assert.ok(out[0].includes("Bien sûr."), "the fragment rides along instead of becoming its own dictation");
});

test("an over-long sentence is cut at a comma, never mid-clause", () => {
  const long = "Les chercheurs affirment que les enfants exposés très tôt à la publicité télévisée développent des préférences durables, ce qui influence leurs demandes auprès de leurs parents pendant de nombreuses années après la première exposition.";
  const out = splitSentences(long);
  assert.ok(out.length > 1, "it must be cut");
  for (const s of out) assert.ok(words(s) <= 28, `"${s}" is still ${words(s)} words`);
  // The cut lands on a comma boundary, so each half is still speakable.
  assert.ok(out[0].endsWith(","), `first half ends "${out[0].slice(-20)}"`);
});

test("a long sentence with no comma is left whole rather than cut badly", () => {
  const long = `Il ${"faut ".repeat(40)}partir`.trim();
  assert.deepEqual(splitSentences(long), [long]);
});

test("line breaks and double spaces from the generator are normalized away", () => {
  const out = splitSentences("  Première phrase de ce texte.\n\n  Deuxième   phrase de ce texte.  ");
  assert.deepEqual(out, ["Première phrase de ce texte.", "Deuxième phrase de ce texte."]);
});

test("a text with no final period still yields its last sentence", () => {
  const out = splitSentences("La première phrase est complète. La seconde n'a pas de point final");
  assert.equal(out.length, 2);
  assert.equal(out[1], "La seconde n'a pas de point final");
});

test("empty input yields nothing rather than an empty dictation", () => {
  assert.deepEqual(splitSentences(""), []);
  assert.deepEqual(splitSentences("   "), []);
  assert.deepEqual(splitSentences(null), []);
});
