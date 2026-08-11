// The dictée correction engine (src/utils/dicteeDiff.js).
//
// This module decides what a candidate is told they did wrong, and the whole
// feature rests on one distinction: a missing accent means "you heard it, you
// spelt it wrong", a different word means "you did not hear it". Get that
// backwards and the report sends someone to work on their listening when their
// listening was fine — so the accent/miss boundary is fixtured hard below.
//
// Pure module, no imports of its own, so it runs here exactly as it runs in
// the browser during a live dictée.

import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, diffSentence, summarize, ERROR_FAMILIES } from "../src/utils/dicteeDiff.js";

const families = (d) => d.words.filter((w) => w.family).map((w) => w.family);
const statuses = (d) => d.words.map((w) => w.status);

/* -------------------------------- tokens --------------------------------- */

test("elision splits the way it is heard", () => {
  assert.deepEqual(tokenize("l'homme").map((t) => t.raw), ["l'", "homme"]);
  assert.deepEqual(tokenize("aujourd'hui").map((t) => t.raw), ["aujourd'", "hui"]);
});

test("a hyphen is a separator, so spaced and hyphenated forms align", () => {
  assert.deepEqual(tokenize("peut-être").map((t) => t.raw), ["peut", "être"]);
  const d = diffSentence("Il est peut-être parti.", "Il est peut être parti");
  assert.equal(d.ok, d.total, "a hyphen the candidate could not hear must not cost a point");
});

test("punctuation and capitals are not scored", () => {
  const d = diffSentence("Bonjour, comment allez-vous ?", "bonjour comment allez vous");
  assert.equal(d.ok, d.total);
  assert.deepEqual(d.errors, {});
});

test("apostrophe style is normalized", () => {
  const d = diffSentence("C'est l'avenir.", "C’est l’avenir");
  assert.equal(d.ok, d.total);
});

/* ------------------------ the accent/miss boundary ------------------------ */

test("a missing accent is an accent error, not a missed word", () => {
  const d = diffSentence("Le développement économique a été rapide.", "Le developpement economique a ete rapide");
  assert.equal(d.total, 6);
  assert.equal(d.heard, 6, "every word was heard correctly");
  assert.equal(d.ok, 3, "three of them are misspelt");
  assert.deepEqual(d.errors, { accent: 3 });
  assert.deepEqual(statuses(d), ["ok", "accent", "accent", "ok", "accent", "ok"]);
});

test("accent percentages count only accented words actually reproduced", () => {
  const d = diffSentence("Il a été très élégant.", "Il a ete tres elegant");
  assert.equal(d.accentTotal, 3);
  assert.equal(d.accentOk, 0);
  // A word missed outright was never a chance to place its accent, so it must
  // not inflate the accent figure.
  const missed = diffSentence("Il a été très élégant.", "Il a été");
  assert.equal(missed.accentTotal, 3);
  assert.equal(missed.accentOk, 1);
});

/* ---------------------------- error families ----------------------------- */

test("grammatical homophones outrank the accent that distinguishes them", () => {
  // "a"/"à" differ only by an accent, but the fix is a grammar rule, not a
  // keyboard habit — the candidate must be sent to the rule.
  assert.deepEqual(families(diffSentence("Il va à Paris.", "Il va a Paris")), ["homophone"]);
  assert.deepEqual(families(diffSentence("Où vas-tu ?", "Ou vas tu")), ["homophone"]);
  assert.deepEqual(families(diffSentence("C'est son livre.", "C'est sont livre")), ["homophone"]);
  assert.deepEqual(families(diffSentence("Ils ont fini.", "Ils on fini")), ["homophone"]);
});

test("-é / -er / -ez confusions are their own family", () => {
  assert.deepEqual(families(diffSentence("Il a participé au débat.", "Il a participer au débat")), ["ending"]);
  assert.deepEqual(families(diffSentence("Vous devez parler.", "Vous devez parlé")), ["ending"]);
});

test("silent agreement marks are reported as agreement, not spelling", () => {
  assert.deepEqual(families(diffSentence("Les enfants jouent.", "Les enfant jouent")), ["plural"]);
  assert.deepEqual(families(diffSentence("Une grande maison.", "Une grand maison")), ["plural"]);
  // -e vs -es is subject agreement, which must win over the -é/-er family.
  assert.deepEqual(families(diffSentence("Tu parles bien.", "Tu parle bien")), ["plural"]);
});

test("an unstressed grammar word dropped is 'petits mots', a content word is a real miss", () => {
  assert.deepEqual(families(diffSentence("Il va à la maison.", "Il va la maison")), ["function"]);
  assert.deepEqual(families(diffSentence("Le chat dort.", "Le dort")), ["missed"]);
});

test("a near-miss is spelling, a wholly different word is a listening miss", () => {
  assert.deepEqual(families(diffSentence("Le gouvernement agit.", "Le gouvernment agit")), ["spelling"]);
  assert.deepEqual(families(diffSentence("Le gouvernement agit.", "Le rassemblement agit")), ["missed"]);
});

test("an invented word is counted separately from the expected words", () => {
  const d = diffSentence("Il part demain.", "Il part très demain");
  assert.equal(d.ok, 3, "the three real words are still correct");
  assert.deepEqual(d.extras, ["très"]);
  assert.equal(d.errors.extra, 1);
});

/* -------------------------- alignment behaviour --------------------------- */

test("a wrong word reads as one substitution, not a deletion plus an insertion", () => {
  const d = diffSentence("Je prends le train.", "Je prends le bus");
  assert.deepEqual(statuses(d), ["ok", "ok", "ok", "wrong"]);
  assert.equal(d.extras.length, 0);
});

test("a dropped clause leaves the surrounding words aligned", () => {
  const d = diffSentence("Le rapport, publié hier, est très clair.", "Le rapport est très clair");
  assert.equal(d.ok, 5);
  assert.equal(d.words.filter((w) => w.status === "missing").length, 2);
});

test("an empty answer scores zero without throwing", () => {
  const d = diffSentence("Une phrase quelconque.", "");
  assert.equal(d.ok, 0);
  assert.equal(d.total, 3);
  assert.equal(d.words.every((w) => w.status === "missing"), true);
});

/* -------------------------------- summary -------------------------------- */

test("summarize separates what was heard from what was spelt", () => {
  const s = summarize([
    diffSentence("Le développement économique a été rapide.", "Le developpement economique a ete rapide"),
    diffSentence("Les enfants jouent dehors.", "Les enfant jouent dehors"),
  ]);
  assert.equal(s.words, 10);
  assert.equal(s.correct, 6);
  // Nine of ten words were correctly identified by ear; only "enfant" for
  // "enfants" is a genuine mishearing, the other three are accents.
  assert.equal(s.heard, 9);
  assert.equal(s.score, 60);
  assert.equal(s.heardPct, 90);
  assert.deepEqual(s.errors, { accent: 3, plural: 1 });
  assert.equal(s.ranked[0].family, "accent");
  assert.equal(s.ranked[0].count, 3);
});

test("every family the engine can emit has a label and a hint to show", () => {
  const emitted = new Set();
  const cases = [
    ["Il va à Paris.", "Il va a Paris"],
    ["Il a participé.", "Il a participer"],
    ["Les enfants jouent.", "Les enfant jouent"],
    ["Il a été là.", "Il a ete là"],
    ["Il va à la maison.", "Il va la maison"],
    ["Le gouvernement agit.", "Le gouvernment agit"],
    ["Le chat dort.", "Le rossignol dort"],
    ["Il part demain.", "Il part très demain"],
  ];
  for (const [exp, got] of cases) {
    for (const f of Object.keys(diffSentence(exp, got).errors)) emitted.add(f);
  }
  assert.equal(emitted.size, Object.keys(ERROR_FAMILIES).length, `families emitted: ${[...emitted].join(", ")}`);
  for (const f of emitted) {
    assert.ok(ERROR_FAMILIES[f]?.label, `${f} has no label`);
    assert.ok(ERROR_FAMILIES[f]?.hint, `${f} has no hint`);
  }
});

test("a perfect dictée reports no errors at all", () => {
  const s = summarize([diffSentence("La ville a beaucoup changé depuis dix ans.", "La ville a beaucoup changé depuis dix ans.")]);
  assert.equal(s.score, 100);
  assert.equal(s.heardPct, 100);
  assert.equal(s.accentPct, 100);
  assert.deepEqual(s.ranked, []);
});
