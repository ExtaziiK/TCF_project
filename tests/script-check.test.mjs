// Detecting wrong-script input (api/_lib/scriptCheck.js).
//
// A candidate's system input language is set to something other than French —
// Arabic, Cyrillic, Urdu — and they submit text that is not French in any
// sense a grader can assess. The AI usually notices in its summary ("le texte
// est incompréhensible") but that is a different skill from SCORING it: asked
// to place a whole number on a scale whose lowest described band was "4-5 A2
// isolated sentences", the grading model reached for a plausible mid-range
// number instead of near-zero, producing a 9/20 "B1, NCLC 6" for text its own
// summary called incomprehensible.
//
// Deterministic check, so it belongs in code — same reasoning as
// copiedPrompt.js for a pasted consigne.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nonLatinLetterShare, NOT_LATIN_SCRIPT } from "../api/_lib/scriptCheck.js";

// The actual failure case: Arabic/Urdu-script gibberish submitted to the
// Expression écrite workshop, scored 9/20 before this check existed.
const ARABIC_GIBBERISH = "خختشخي ٹهيتٹيبس مٹيکن مي";
const CYRILLIC = "Привет, как дела сегодня утром, я хочу написать текст";

const REAL_FRENCH = "Je vous écris pour vous informer des nouveaux locaux de notre entreprise, situés au centre-ville.";

test("wrong-script gibberish is caught", () => {
  const share = nonLatinLetterShare(ARABIC_GIBBERISH);
  assert.ok(share >= NOT_LATIN_SCRIPT, `expected >= ${NOT_LATIN_SCRIPT}, got ${share.toFixed(2)}`);
});

test("another non-Latin script is caught too — this is not Arabic-specific", () => {
  const share = nonLatinLetterShare(CYRILLIC);
  assert.ok(share >= NOT_LATIN_SCRIPT, `expected >= ${NOT_LATIN_SCRIPT}, got ${share.toFixed(2)}`);
});

test("real French is never caught", () => {
  assert.equal(nonLatinLetterShare(REAL_FRENCH), 0);
});

test("a foreign proper noun inside French prose does not trip it", () => {
  // The check must judge the WHOLE text, not flag on a single character —
  // otherwise any French answer that names a person or place outside the
  // Latin-script world would be wrongly refused.
  const text = "J'ai rencontré Владимир lors de la conférence à Montréal, et nous avons discuté longtemps.";
  const share = nonLatinLetterShare(text);
  assert.ok(share < NOT_LATIN_SCRIPT, `expected < ${NOT_LATIN_SCRIPT}, got ${share.toFixed(2)}`);
});

test("short input is never judged — not enough signal either way", () => {
  assert.equal(nonLatinLetterShare("مرحبا"), 0); // 5 non-Latin letters, below MIN_LETTERS
  assert.equal(nonLatinLetterShare("oui"), 0);
  assert.equal(nonLatinLetterShare(""), 0);
  assert.equal(nonLatinLetterShare(null), 0);
});
