// Deterministic derivations inside normalizeFeedback (api/_lib/groq.js) — the
// values it computes itself rather than trusting the model for, and why:
// asking the model for two numbers that must agree (a score and a matching
// level) reliably produces ones that don't.
//
// targetLevel is the newest case: the "corrected" rewrite is instructed to
// always reach C2 (api/expression-ecrite.js), so the level it reaches is a
// fixed fact about the FEATURE, not a per-answer judgement call. It used to
// be a field the model filled in itself ("<CEFR level the rewrite reaches>"),
// which is how a C1-graded essay's rewrite came back labelled "C1" instead of
// the C2 it was supposed to be written at — the model echoed the original
// grade instead of confirming it had actually written to the ceiling.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeFeedback } from "../api/_lib/groq.js";

test("a rewrite always reports C2, regardless of what the model claims", () => {
  // Even if a (hypothetical, non-conforming) model reply still included its
  // own targetLevel, it must be ignored — normalizeFeedback no longer reads
  // that field at all.
  const out = normalizeFeedback({ score: 12, corrected: "Une version réécrite.", targetLevel: "C1" });
  assert.equal(out.targetLevel, "C2");
});

test("no rewrite means no target level", () => {
  const out = normalizeFeedback({ score: 12, corrected: "" });
  assert.equal(out.targetLevel, "");
});

test("a non-string corrected field coerces to no rewrite and no target level", () => {
  // The hostile-input security test (security.test.mjs) already covers
  // `corrected` itself coercing to ""; this is the same input, asserting the
  // DERIVED field stays consistent with it rather than drifting independently.
  const out = normalizeFeedback({ score: 12, corrected: 42 });
  assert.equal(out.corrected, "");
  assert.equal(out.targetLevel, "");
});

test("level and NCLC come from the score table, never from the model", () => {
  // A model asked for both a score and a level will happily return ones that
  // don't correspond; only the score is trusted, and level/NCLC are looked up
  // from it (api/_lib/levels.js).
  const out = normalizeFeedback({ score: 9, level: "C2", nclc: 10 });
  assert.equal(out.score, 9);
  assert.equal(out.level, "B1");
  assert.equal(out.nclc, 6);
});
