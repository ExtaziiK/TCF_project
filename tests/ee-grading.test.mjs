// The Expression écrite grader follows the exam's grid: spelling is its own
// criterion, and each tâche is judged against what it actually requires —
// above all Tâche 3's two parts (synthesis of both documents, then opinion).
import { test } from "node:test";
import assert from "node:assert/strict";
import { countWords } from "../src/utils/writingDrafts.js";

process.env.VITE_SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test";
const ee = await import("../api/expression-ecrite.js");

test("spelling is graded as a fifth criterion, and caps the score when it is weak", () => {
  const sys = ee.eeSystem("fr", 1);
  assert.match(sys, /Rate five criteria/);
  assert.match(sys, /5\. Orthographe/);
  assert.match(sys, /"orthographe":<0-20>/);
  assert.match(sys, /Orthographe at 10 or below caps the OVERALL score at 12/);
});

test("Tâche 3 requires a synthesis of both documents AND an argued opinion", () => {
  const brief = ee.EE_TASK_BRIEFS[3];
  assert.match(brief, /TWO REQUIRED PARTS/);
  assert.match(brief, /SYNTHESIS/);
  assert.match(brief, /OWN OPINION/);
  assert.match(brief, /OVERALL score at most 11/);
  assert.match(ee.eeSystem("fr", 3), /COMPARING TWO POINTS OF VIEW/);
});

test("each tâche gets its own brief, and an unknown one none", () => {
  assert.match(ee.eeSystem("fr", 1), /a MESSAGE \(60-120 words\)/);
  assert.match(ee.eeSystem("fr", 2), /ARTICLE, LETTER, NOTE, BLOG POST or REPLY/);
  assert.doesNotMatch(ee.eeSystem("fr", undefined), /THIS TÂCHE/);
});

test("words are counted like the exam counter: runs of non-space characters", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("   "), 0);
  assert.equal(countWords("Bonjour  Karim,\nj'espère que tu vas bien."), 7);
});

test("the overall score never floats above the criteria it is built from", async () => {
  const { applyCriteriaCaps } = await import("../api/_lib/eeSpec.js");
  const crit = (o) => ({ consigne: 15, coherence: 15, lexique: 15, morphosyntaxe: 15, orthographe: 15, ...o });
  // weakest criterion + 2
  assert.equal(applyCriteriaCaps({ score: 15, criteria: crit({ lexique: 10 }) }).score, 12);
  // Consigne + 1
  assert.equal(applyCriteriaCaps({ score: 15, criteria: crit({ consigne: 12 }) }).score, 13);
  // weak spelling
  assert.equal(applyCriteriaCaps({ score: 14, criteria: crit({ orthographe: 7 }) }).score, 9);
  // nothing to cap: untouched
  const ok = { score: 15, criteria: crit({}) };
  assert.equal(applyCriteriaCaps(ok), ok);
  // a 0-3 / not-an-answer result is left alone
  assert.equal(applyCriteriaCaps({ score: 2, criteria: {} }).score, 2);
});

test("the grader checks that examples serve the consigne, and leans low", () => {
  const sys = ee.eeSystem("fr", 3);
  assert.match(sys, /ALWAYS take the lower one/);
  assert.match(sys, /does it prove THIS claim, about THIS subject/);
  assert.match(sys, /main argument or main example is beside the point/);
});

test("content faults the grader flags are capped in code", async () => {
  const { applyCriteriaCaps } = await import("../api/_lib/eeSpec.js");
  const fb = { score: 14, criteria: { consigne: 14, coherence: 14, lexique: 14, morphosyntaxe: 14, orthographe: 16 } };
  assert.equal(applyCriteriaCaps(fb, { contentFaults: { offPointExample: true } }).score, 11);
  assert.equal(applyCriteriaCaps(fb, { contentFaults: { genericThroughout: true } }).score, 13);
  assert.equal(applyCriteriaCaps(fb, { contentFaults: { offPointExample: "mon neveu passe quatre heures sur sa console" } }).score, 11);
  assert.equal(applyCriteriaCaps(fb, { contentFaults: { offPointExample: "" } }).score, 14);
  assert.equal(applyCriteriaCaps(fb, { contentFaults: { offPointExample: false } }).score, 14);
  assert.match(ee.eeSystem("fr", 2), /"contentFaults":\{"offPointExample"/);
});
