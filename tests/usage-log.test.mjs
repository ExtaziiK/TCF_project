// The insert-fallback ordering in api/_lib/usage.js.
//
// error_status, error_detail and error_request landed in three separate
// migrations. A deploy can land ahead of any of them, and inserting a row with
// a column the database doesn't have yet fails the WHOLE insert — so the
// fallback has to degrade one column at a time rather than all-or-nothing:
// losing Groq's reason or the request snapshot is a small cost, losing the
// failure row itself — the thing that makes a saturated day visible at all —
// is not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInsertAttempts } from "../api/_lib/usage.js";

const BASE = { user_id: "u1", endpoint: "expression-ecrite", kind: "chat", model: "openai/gpt-oss-20b", error_status: 429 };

test("a successful call (no error fields) tries exactly the base row", () => {
  const attempts = buildInsertAttempts(BASE, {});
  assert.deepEqual(attempts, [BASE]);
});

test("a failure with both diagnostic fields tries full, then detail-only, then base", () => {
  const attempts = buildInsertAttempts(BASE, { errorDetail: "Rate limit reached", errorRequest: { model: "x" } });
  assert.deepEqual(attempts, [
    { ...BASE, error_detail: "Rate limit reached", error_request: { model: "x" } },
    { ...BASE, error_detail: "Rate limit reached" },
    BASE,
  ]);
});

test("error_request without error_detail still falls back to base — no crash on the gap", () => {
  const attempts = buildInsertAttempts(BASE, { errorRequest: { model: "x" } });
  assert.deepEqual(attempts, [{ ...BASE, error_request: { model: "x" } }, BASE]);
});

test("every attempt after the first is a strict subset of the one before it", () => {
  // The property that actually matters: each retry must only ever DROP a
  // field, never introduce a different row shape, or a partial-migration
  // deploy could silently insert something unexpected.
  const attempts = buildInsertAttempts(BASE, { errorDetail: "d", errorRequest: { a: 1 } });
  for (let i = 1; i < attempts.length; i++) {
    for (const key of Object.keys(attempts[i])) {
      assert.equal(attempts[i][key], attempts[i - 1][key], `key "${key}" changed value between attempts instead of just disappearing`);
    }
  }
});
