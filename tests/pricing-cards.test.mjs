// What the plan cards let a visitor compare (src/constants/pricing.js).
//
// The three paid tiers grant mostly the same things. The cards only work if the
// handful of lines that DIFFER can be read straight across the row — same axes,
// same order, one column each — with everything shared listed after them and
// word-for-word identical from card to card. None of that is enforced by the
// renderer: it is a property of the data, and it decays the first time somebody
// adds a line to one card and not the others. So it is asserted here.
import { test } from "node:test";
import assert from "node:assert/strict";

import { PLANS } from "../src/constants/pricing.js";

const paid = PLANS.filter((p) => p.slug);
const byName = (name) => PLANS.find((p) => p.name === name);

test("the paid tiers are Starter, Pro and Ultimate, in ascending duration", () => {
  assert.deepEqual(paid.map((p) => p.name), ["Starter", "Pro", "Ultimate"]);
  assert.deepEqual(paid.map((p) => p.days), [15, 30, 90]);
});

test("the shared block is word-for-word identical on all three paid cards", () => {
  // Not "similar": identical. A shared block that differs by a word puts a
  // difference in front of the reader where there is none.
  for (const p of paid) assert.deepEqual(p.also, paid[0].also, `${p.name}'s shared block has drifted`);
  assert.ok(paid[0].also.length >= 3);
});

test("the free tier has no shared block — it is the baseline, not a paid tier", () => {
  assert.equal(byName("Basic").also, undefined);
  assert.ok(byName("Basic").feats.length > 4);
});

test("nothing is listed twice on the same card", () => {
  for (const p of PLANS) {
    const all = [...p.feats, ...(p.also || [])];
    assert.equal(new Set(all).size, all.length, `${p.name} repeats a line`);
  }
});

test("the paid cards differ on the same four axes, in the same order", () => {
  // Read down a column and you get one tier; read across a row and you get the
  // choice being made. Both only work if the rows line up.
  const axes = [/simulations? IA/i, /TCF blancs?/i, /dictée/i, /appareil/i];
  for (const p of paid) {
    assert.equal(p.feats.length, axes.length, `${p.name} has ${p.feats.length} differentiators, expected ${axes.length}`);
    p.feats.forEach((line, i) => {
      assert.match(line, axes[i], `${p.name}'s line ${i + 1} is off-axis`);
    });
  }
});

test("the device axis reads 1 / 2 / 4, matching the CGU and device_limit_for()", () => {
  const devices = paid.map((p) => p.feats.at(-1));
  assert.match(devices[0], /un seul appareil/i); // Starter: no digit to bold, so it is spelt out
  assert.match(devices[1], /\b2\b/);
  assert.match(devices[2], /\b4\b/);
});

test("only Starter is capped; Pro and Ultimate say so on every axis", () => {
  const [starter, pro, ultimate] = paid;
  for (const line of starter.feats.slice(0, 3)) assert.match(line, /par jour|\bpar tâche\b/i);
  for (const p of [pro, ultimate]) {
    for (const line of p.feats.slice(0, 3)) {
      assert.match(line, /illimité|sans limite/i, `${p.name}: "${line}" should be unlimited`);
    }
  }
});
