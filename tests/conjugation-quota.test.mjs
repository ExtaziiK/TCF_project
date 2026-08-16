// The free tier's ten minutes a day on the conjugation exercises.
//
// The pure parts of the quota are checked here — the day key, the reset
// boundary and the limits themselves — because they are the pieces that decide
// when a paywall appears in front of a paying-eligible candidate, and they are
// all easy to get subtly wrong: a UTC day key hands a candidate in Montréal a
// reset in the middle of their afternoon, and a reset computed as "+24 h"
// rather than "next local midnight" drifts a little further every day.
//
// Only the pure module is imported — the reads and writes it feeds live in
// conjugationQuotaService.js, which cannot load outside a browser build.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = pathToFileURL(path.join(root, "src", "utils", "conjugationQuota.js")).href;
const { DAILY_LIMIT_SECONDS, WARN_AT_SECONDS_LEFT, todayKey, nextResetAt } = await import(src);

test("the budget is ten minutes, warned at five", () => {
  assert.equal(DAILY_LIMIT_SECONDS, 600);
  assert.equal(WARN_AT_SECONDS_LEFT, 300);
  assert.ok(WARN_AT_SECONDS_LEFT < DAILY_LIMIT_SECONDS, "the warning must fall inside the budget");
});

test("the day key is the candidate's local date, in the format Postgres wants", () => {
  const key = todayKey(new Date(2026, 7, 16, 23, 59, 59));
  assert.equal(key, "2026-08-16");
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/, "a Postgres `date` column takes YYYY-MM-DD");

  // One minute later is a different day — the boundary is local midnight, and
  // it must not be pulled forward or back by the machine's UTC offset.
  assert.equal(todayKey(new Date(2026, 7, 17, 0, 0, 30)), "2026-08-17");
  assert.notEqual(todayKey(new Date(2026, 7, 16, 23, 59, 59)), todayKey(new Date(2026, 7, 17, 0, 0, 30)));
});

test("the reset is the next local midnight, not a rolling 24 hours", () => {
  const at = nextResetAt(new Date(2026, 7, 16, 14, 30, 0));
  assert.equal(at.getHours(), 0);
  assert.equal(at.getMinutes(), 0);
  assert.equal(at.getSeconds(), 0);
  assert.equal(at.getDate(), 17, "the same day's midnight has passed; the reset is tomorrow's");

  // A candidate one minute before midnight waits one minute, not a full day.
  const soon = nextResetAt(new Date(2026, 7, 16, 23, 59, 0));
  assert.equal(soon.getDate(), 17);
  assert.ok(soon - new Date(2026, 7, 16, 23, 59, 0) <= 60_000);

  // And the reset always names a moment in the future, never one just past.
  const now = new Date();
  assert.ok(nextResetAt(now) > now);
});

test("the day key rolls over exactly when the reset fires", () => {
  const before = new Date(2026, 11, 31, 23, 59, 59);
  const reset = nextResetAt(before);
  // Crossing into the new year is the case a naive "day + 1" gets wrong.
  assert.equal(todayKey(before), "2026-12-31");
  assert.equal(todayKey(reset), "2027-01-01");
});
