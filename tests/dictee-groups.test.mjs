// Sense-group splitting (api/_lib/dictee.js → splitGroups) and the segment
// assembly built on top of it (src/utils/dicteeSegments.js).
//
// These two decide what a candidate hears in one go, which is the single
// biggest lever on how hard the dictée is. Two properties matter more than any
// individual cut and are fixtured hardest below:
//
//   1. Joining the atoms back reproduces the text EXACTLY. The correction is
//      scored against that join, so a lost space or a swallowed comma would
//      mark someone down against a text nobody ever read to them.
//   2. No segment crosses a sentence end, at any setting.

import { test } from "node:test";
import assert from "node:assert/strict";
import { splitGroups, speechFor } from "../api/_lib/dictee.js";
import { buildSegments, endsSentence, segmentMode, SEGMENT_MODES } from "../src/utils/dicteeSegments.js";

const words = (s) => (s.match(/[\p{L}\p{N}]+/gu) || []).length;
const norm = (s) => s.replace(/\s+/g, " ").trim();

const LONG = "Les chercheurs affirment que les enfants exposés très tôt à la publicité télévisée développent des préférences durables, ce qui influence leurs demandes auprès de leurs parents pendant de nombreuses années.";

/* ------------------------------- the atoms -------------------------------- */

test("atoms rejoin into exactly the text that was split", () => {
  const text = "La ville a beaucoup changé cette année, et les habitants sont plus nombreux qu'avant. Faut-il vraiment encadrer la publicité destinée aux enfants ? La question mérite d'être posée sérieusement parce que les enjeux sont considérables.";
  assert.equal(splitGroups(text).join(" "), norm(text));
});

test("a long sentence is cut into speakable groups", () => {
  const atoms = splitGroups(LONG);
  assert.ok(atoms.length >= 3, `expected several groups, got ${atoms.length}`);
  for (const a of atoms) assert.ok(words(a) <= 12, `"${a}" is ${words(a)} words`);
  assert.equal(atoms.join(" "), norm(LONG));
});

test("no group is left with fewer than three words", () => {
  for (const a of splitGroups(LONG)) assert.ok(words(a) >= 3, `"${a}" is only ${words(a)} words`);
});

test("a comma outranks a preposition as a breathing point", () => {
  const atoms = splitGroups("Les enfants regardent la télévision pendant des heures, puis ils réclament les jouets vus dans les publicités.");
  assert.ok(atoms[0].endsWith(","), `first group ends "${atoms[0]}" — the comma should have won`);
});

test("a multi-word subordinator is never split across its own halves", () => {
  // "parce que" must open a group whole; a dangling "que" is not a sense group.
  for (const a of splitGroups("Le gouvernement a renoncé à ce projet ambitieux parce que les finances publiques ne le permettaient plus cette année.")) {
    assert.ok(!/^que\b/i.test(a), `"${a}" starts with a stranded "que"`);
  }
});

test("a short sentence is one group and is not cut", () => {
  assert.deepEqual(splitGroups("Le maire annonce un nouveau plan."), ["Le maire annonce un nouveau plan."]);
});

test("a long sentence with no legal breathing point is left whole", () => {
  const long = `Il ${"faut ".repeat(40)}partir`.trim();
  assert.deepEqual(splitGroups(long), [long]);
});

test("empty input yields nothing rather than an empty dictation", () => {
  assert.deepEqual(splitGroups(""), []);
  assert.deepEqual(splitGroups("   "), []);
  assert.deepEqual(splitGroups(null), []);
});

test("a short sentence stands alone instead of being buried in the one before", () => {
  // The legacy sentence splitter glues anything under five words onto its
  // predecessor. Doing that here would put a full stop inside an atom, and
  // every segment built from that atom would silently run across it.
  const atoms = splitGroups("Les demandes augmentent auprès de leurs parents chaque année. Il faut agir.");
  assert.equal(atoms.at(-1), "Il faut agir.");
  for (const a of atoms.slice(0, -1)) assert.ok(!/[.!?…]\s+\S/.test(a), `"${a}" hides a sentence end`);
});

/* ----------------------------- the segments ------------------------------- */

const TEXT = "La ville a beaucoup changé cette année, et les habitants sont bien plus nombreux qu'avant. Le maire annonce un nouveau plan. Les chercheurs affirment que les enfants exposés très tôt à la publicité développent des préférences durables.";

test("every mode reproduces the whole text, in order", () => {
  const atoms = splitGroups(TEXT);
  for (const mode of SEGMENT_MODES) {
    const segs = buildSegments(atoms, mode.target);
    assert.equal(segs.map((s) => s.text).join(" "), norm(TEXT), `mode ${mode.id} lost or reordered text`);
  }
});

test("no segment crosses a sentence end, at any setting", () => {
  const atoms = splitGroups(TEXT);
  for (const mode of SEGMENT_MODES) {
    for (const seg of buildSegments(atoms, mode.target)) {
      // Only the final atom of a segment may close a sentence.
      for (let i = seg.from; i < seg.to; i++) {
        assert.ok(!endsSentence(atoms[i]), `mode ${mode.id}: segment "${seg.text}" runs past a full stop`);
      }
    }
  }
});

test("Débutant hands out one atom at a time", () => {
  const atoms = splitGroups(TEXT);
  const segs = buildSegments(atoms, segmentMode("court").target);
  assert.equal(segs.length, atoms.length);
});

test("Examen hands out whole sentences", () => {
  const segs = buildSegments(splitGroups(TEXT), segmentMode("phrase").target);
  assert.equal(segs.length, 3);
  assert.ok(segs[1].text.startsWith("Le maire"));
});

test("Standard sits between the two and is longer than one atom", () => {
  const atoms = splitGroups(TEXT);
  const segs = buildSegments(atoms, segmentMode("moyen").target);
  assert.ok(segs.length < atoms.length, "it should join atoms together");
  assert.ok(segs.length > 3, "…but not as far as whole sentences");
});

test("segment indices address the recordings that make it up", () => {
  const atoms = splitGroups(TEXT);
  for (const seg of buildSegments(atoms, 10)) {
    assert.equal(atoms.slice(seg.from, seg.to + 1).join(" "), seg.text);
  }
});

test("a sentence never ends on a two-word scrap", () => {
  // "…nombreux qu'avant." would otherwise be left alone by a target that runs
  // out one atom early.
  for (const seg of buildSegments(splitGroups(TEXT), 10)) {
    assert.ok(seg.words >= 4, `"${seg.text}" is only ${seg.words} words`);
  }
});

test("an unknown mode id falls back to the default instead of throwing", () => {
  assert.equal(segmentMode("nonsense").id, segmentMode(undefined).id);
  assert.ok(Number.isFinite(segmentMode("nonsense").target));
});

test("no atoms means no segments", () => {
  assert.deepEqual(buildSegments([], 10), []);
  assert.deepEqual(buildSegments(null, 10), []);
});

/* ------------------------------ what is spoken ---------------------------- */

test("a group ending mid-clause is spoken with a continuing intonation", () => {
  // Each group is synthesized as its own request, so a bare phrase comes back
  // with the falling contour of a finished sentence — and two of those played
  // back to back sound like two statements. The comma buys the contour that
  // makes them sound like one.
  assert.equal(speechFor("les enfants exposés très tôt"), "les enfants exposés très tôt,");
});

test("punctuation the generator wrote is left exactly as it is", () => {
  for (const s of ["les enfants exposés,", "Il faut agir.", "Faut-il agir ?", "Il partit…", "il dit « non »"]) {
    assert.equal(speechFor(s), s);
  }
});

test("what is spoken never becomes what is scored", () => {
  // The comma exists only in the SSML. If it ever leaked back into the
  // reference, every candidate would be marked down for the punctuation of a
  // group boundary they had no way of hearing.
  const atoms = splitGroups("Les chercheurs affirment que les enfants exposés très tôt à la publicité développent des préférences durables.");
  for (const a of atoms) assert.ok(speechFor(a).length >= a.length);
  assert.ok(!atoms.some((a) => speechFor(a) === a && !/[.,;:!?…»"]$/.test(a)));
});

/* --------------------- rows written before sense groups ------------------- */

test("a cached text re-derives into groups that rebuild it exactly", () => {
  // api/dictee.js upgrades a pre-groups row by re-splitting its stored text
  // rather than regenerating it, which keeps the text anyone already scored
  // against. That upgrade is only safe while this holds.
  const cached = [
    "Le télétravail a transformé nos habitudes professionnelles depuis quelques années. Beaucoup de salariés apprécient la souplesse qu'il apporte, mais certains regrettent les échanges du bureau.",
    "Madame, je vous écris au sujet du logement que vous proposez à la location dans votre annonce. Je souhaiterais le visiter cette semaine si cela vous convient.",
    "Faut-il encadrer la publicité destinée aux enfants ? Les deux documents s'opposent nettement sur ce point, et la question mérite un examen attentif.",
  ];
  for (const text of cached) assert.equal(splitGroups(text).join(" "), text);
});
