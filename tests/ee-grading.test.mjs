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
