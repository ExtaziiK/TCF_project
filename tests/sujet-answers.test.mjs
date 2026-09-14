// The Expression écrite model answers: the two pieces with real logic in them.
//
// `highlight` is what turns a stored answer plus its keyword list into the
// highlighted text a candidate reads — it runs on every render of a Premium
// page, and getting the overlap rule wrong silently mangles the corrigé.
// `markAnswered` is what lights up the public "Voir un modèle de réponse" link,
// so a mistake there either hides a corrigé that exists or advertises one that
// does not.

import { test } from "node:test";
import assert from "node:assert/strict";
import { highlight, markAnswered, hasAnswer } from "../src/services/sujetsAnswersFormat.js";

const strongText = (parts) => parts.filter((p) => p.strong).map((p) => p.text);
const joined = (parts) => parts.map((p) => p.text).join("");

test("the body survives highlighting unchanged", () => {
  const body = "En dépit des apparences, la question mérite mieux qu'un slogan.";
  const parts = highlight(body, ["En dépit de", "mérite mieux"]);
  assert.equal(joined(parts), body);
});

test("a longer expression wins over a shorter one that starts inside it", () => {
  // "de" would otherwise cut "en dépit de" in half and leave a dangling "en dépit ".
  const parts = highlight("en dépit de tout", ["de", "en dépit de"]);
  assert.deepEqual(strongText(parts), ["en dépit de"]);
});

test("matching ignores case but keeps the text's own casing", () => {
  const parts = highlight("Force est de constater que oui.", ["force est de constater"]);
  assert.deepEqual(strongText(parts), ["Force est de constater"]);
  assert.equal(joined(parts), "Force est de constater que oui.");
});

test("every occurrence is highlighted, not just the first", () => {
  const parts = highlight("Par ailleurs c'est vrai. Par ailleurs c'est utile.", ["Par ailleurs"]);
  assert.equal(strongText(parts).length, 2);
});

test("no keywords leaves one plain run, and an empty body yields nothing", () => {
  assert.deepEqual(highlight("texte", []), [{ text: "texte", strong: false }]);
  assert.deepEqual(highlight("", ["x"]), []);
  assert.deepEqual(highlight("texte", ["ab"]), [{ text: "texte", strong: false }]); // under the 3-char floor
});

test("a keyword absent from the body changes nothing", () => {
  const parts = highlight("Un texte neutre.", ["cette tournure n'y est pas"]);
  assert.deepEqual(strongText(parts), []);
  assert.equal(joined(parts), "Un texte neutre.");
});

test("markAnswered flags only the generated combinaisons", () => {
  const data = [{ n: 1, t1: "a" }, { n: 2, t1: "b" }, { n: 3, t1: "c" }];
  const out = markAnswered(data, [1, 3]);
  assert.deepEqual(out.map(hasAnswer), [true, false, true]);
});

test("markAnswered leaves the original array untouched", () => {
  const data = [{ n: 1, t1: "a" }];
  const out = markAnswered(data, [1]);
  assert.equal(hasAnswer(data[0]), false, "the input must not be mutated");
  assert.equal(hasAnswer(out[0]), true);
  assert.equal(out[0].t1, "a", "the rest of the combinaison is preserved");
});

test("combinaisons with no explicit n fall back to their position", () => {
  // Hand-added months can lack `n`; the renderer numbers them by index, so the
  // flag has to follow the same rule or it lands on the wrong card.
  const out = markAnswered([{ t1: "a" }, { t1: "b" }], [2]);
  assert.deepEqual(out.map(hasAnswer), [false, true]);
});

test("hasAnswer is strict about the flag", () => {
  assert.equal(hasAnswer({ a: true }), true);
  assert.equal(hasAnswer({ a: "yes" }), false);
  assert.equal(hasAnswer({}), false);
  assert.equal(hasAnswer(null), false);
});
