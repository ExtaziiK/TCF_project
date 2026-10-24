// « Mon lexique » (spaced repetition) and the two vocabulary exercises:
// the review schedule, and the integrity of every hand-written item — one
// answer, three different distractors, a passage that really is in the
// sentence, and a filled sentence that reads right.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newCard, review, isDue, dueCards, deckStats, nextDue, termKey, INTERVAL_DAYS, MAX_BOX, startOfDay } from "../src/utils/srs.js";
import { fillBlank, replaceVague, choicesFor, roundOrder, BLANK } from "../src/utils/vocabExercise.js";
import { MOT_PRECIS } from "../src/constants/vocab/motPrecis.js";
import { CONNECTEURS, RELATIONS } from "../src/constants/vocab/connecteurs.js";

const DAY = 86_400_000;
const T0 = new Date(2026, 9, 24, 15, 30).getTime();

test("a new word is due at once; known words come back later and later", () => {
  let card = newCard({ term: "un enjeu majeur", def: "…" }, T0);
  assert.equal(card.box, 1);
  assert.ok(isDue(card, T0));
  const expected = [2, 3, 4, 5, 5];
  for (const box of expected) {
    card = review(card, true, T0);
    assert.equal(card.box, box);
    assert.equal(card.due, startOfDay(T0) + INTERVAL_DAYS[box] * DAY, `box ${box} waits ${INTERVAL_DAYS[box]} days`);
  }
  assert.equal(card.box, MAX_BOX, "never beyond the last box");
  assert.equal(card.reviews, 5);
});

test("a forgotten word drops to the first box and comes back tomorrow", () => {
  const card = review({ ...newCard({ term: "or" }, T0), box: 4 }, false, T0);
  assert.equal(card.box, 1);
  assert.equal(card.lapses, 1);
  assert.equal(card.due, startOfDay(T0) + DAY);
  assert.ok(!isDue(card, T0));
  assert.ok(isDue(card, startOfDay(T0) + DAY), "due from the start of the next day");
});

test("the review queue, the stats and the next due date", () => {
  const cards = [
    { ...newCard({ term: "a" }, T0), box: 3, due: T0 - DAY },
    { ...newCard({ term: "b" }, T0), box: 1, due: T0 - 2 * DAY },
    { ...newCard({ term: "c" }, T0), box: 4, due: T0 + 5 * DAY },
  ];
  assert.deepEqual(dueCards(cards, T0).map((c) => c.term), ["b", "a"], "weakest box first");
  assert.deepEqual(deckStats(cards, T0), { total: 3, due: 2, mastered: 1 });
  assert.equal(nextDue(cards, T0), T0 + 5 * DAY);
});

test("the same expression however it is typed is one card", () => {
  assert.equal(termKey("  En  revanche "), termKey("en revanche"));
  assert.equal(termKey("Bien qu’"), termKey("bien qu'"));
});

test("connector sentences fill correctly, apostrophes glue to the next word", () => {
  assert.equal(fillBlank("___ il ait plu, le festival a eu lieu.", "Bien qu’"), "Bien qu’il ait plu, le festival a eu lieu.");
  assert.equal(fillBlank("Il a raté son train ; ___, il est arrivé en retard.", "de ce fait"), "Il a raté son train ; de ce fait, il est arrivé en retard.");
  assert.equal(replaceVague("Elle a eu son diplôme.", "a eu", "a obtenu"), "Elle a obtenu son diplôme.");
});

for (const [name, items] of [["Le mot précis", MOT_PRECIS], ["Les connecteurs", CONNECTEURS]]) {
  test(`${name}: every item is well formed`, () => {
    const ids = new Set();
    for (const it of items) {
      assert.ok(!ids.has(it.id), `${it.id} unique`);
      ids.add(it.id);
      assert.equal(it.distractors.length, 3, `${it.id}: three distractors`);
      const all = [it.answer, ...it.distractors];
      assert.equal(new Set(all).size, 4, `${it.id}: four different choices`);
      assert.ok(it.why && it.why.length > 20, `${it.id}: an explanation`);
      assert.match(it.level, /^(A1|A2|B1|B2|C1|C2)$/, `${it.id}: a level`);
      if (it.vague) {
        assert.ok(it.sentence.includes(it.vague), `${it.id}: the vague passage is in the sentence`);
        assert.ok(!replaceVague(it.sentence, it.vague, it.answer).includes(it.vague), `${it.id}: replaced`);
      } else {
        assert.equal(it.sentence.split(BLANK).length, 2, `${it.id}: exactly one blank`);
        assert.ok(it.relation in RELATIONS, `${it.id}: a known relation`);
        const filled = fillBlank(it.sentence, it.answer);
        assert.ok(!filled.includes(BLANK) && !/\s{2}/.test(filled) && !/’ /.test(filled), `${it.id}: « ${filled} »`);
      }
    }
    assert.ok(items.length >= 40);
  });
}

test("a round shows every item once, and the choices keep the answer", () => {
  const order = roundOrder(CONNECTEURS);
  assert.equal(new Set(order).size, CONNECTEURS.length);
  for (const it of MOT_PRECIS) assert.ok(choicesFor(it).includes(it.answer));
});
