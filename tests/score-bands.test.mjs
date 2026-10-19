import { test } from "node:test";
import assert from "node:assert/strict";
import { NCLC_BANDS, nclcFor, minScoreFor, pointsToNclc } from "../api/_lib/scoreBands.js";

test("minScoreFor returns each band's floor", () => {
  assert.equal(minScoreFor("co", 7), 458);
  assert.equal(minScoreFor("ce", 7), 453);
  assert.equal(minScoreFor("ee", 7), 10);
  assert.equal(minScoreFor("eo", 10), 16);
  assert.equal(minScoreFor("co", 4), 331);
  assert.equal(minScoreFor("co", 3), null);
  assert.equal(minScoreFor("xx", 7), null);
});

test("pointsToNclc counts the points still missing", () => {
  assert.equal(pointsToNclc("co", 457, 7), 1);
  assert.equal(pointsToNclc("co", 458, 7), 0);
  assert.equal(pointsToNclc("co", 699, 10), 0);
  assert.equal(pointsToNclc("ce", 445, 7), 8);
  assert.equal(pointsToNclc("ee", 9, 7), 1);
  assert.equal(pointsToNclc("eo", "12", 9), 2);
  assert.equal(pointsToNclc("co", "", 7), null);
  assert.equal(pointsToNclc("co", "abc", 7), null);
  assert.equal(pointsToNclc("co", 400, 11), null);
});

test("the floor of every band is exactly where nclcFor switches level", () => {
  for (const [section, bands] of Object.entries(NCLC_BANDS)) {
    for (const [lo, , lvl] of bands) {
      assert.equal(nclcFor(section, lo), lvl, `${section} ${lo}`);
      assert.equal(pointsToNclc(section, lo, lvl), 0);
      if (lo > 0) assert.ok(nclcFor(section, lo - 1) < lvl, `${section} ${lo - 1} below NCLC ${lvl}`);
    }
  }
});
