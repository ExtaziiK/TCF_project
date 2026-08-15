// What the plan cards let a visitor compare (src/constants/pricing.js) and the
// per-day saving that explains the longest pass's price (src/utils/planValue.js).
//
// The three paid tiers grant mostly the same things. The cards only work if the
// handful of lines that DIFFER can be read straight across the row — same
// axes, same order, one column each — with everything shared moved out of the
// way into a block that is word-for-word identical. None of that is enforced by
// the renderer: it is a property of the data, and it decays the first time
// somebody adds a line to one card and not the others. So it is asserted here.
import { test } from "node:test";
import assert from "node:assert/strict";

import { PLANS } from "../src/constants/pricing.js";
import { perDayValueNotes } from "../src/utils/planValue.js";

const paid = PLANS.filter((p) => p.slug);
const byName = (name) => PLANS.find((p) => p.name === name);

test("the paid tiers are Starter, Pro and Ultimate, in ascending duration", () => {
  assert.deepEqual(paid.map((p) => p.name), ["Starter", "Pro", "Ultimate"]);
  assert.deepEqual(paid.map((p) => p.days), [15, 30, 90]);
});

test("every plan says in one line where it sits", () => {
  for (const p of PLANS) assert.ok(p.tagline, `${p.name} has no tagline`);
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

/* ----------------------- the per-day saving on Ultimate -------------------- */

// Shaped like what usePricingSelection hands the cards: display-currency price
// strings, `days`, `slug` (null = free) and the live-price state.
const card = (name, price, days, extra = {}) => ({ name, price, days, slug: days ? name.toLowerCase() : null, priceState: "live", ...extra });
const ROW = () => [
  card("Basic", "$0", 0, { slug: null }),
  card("Starter", "$7.99", 15),
  card("Pro", "$19.99", 30, { featured: true }),
  card("Ultimate", "$49.99", 90),
];

test("Ultimate is annotated with what it saves per day against Pro", () => {
  const notes = perDayValueNotes(ROW());
  // 49.99/90 = 0.5554 a day against Pro's 19.99/30 = 0.6663.
  assert.deepEqual(notes.Ultimate, { percent: 17, reference: "Pro" });
});

test("Starter is never annotated, cheap by the day though it is", () => {
  // 7.99/15 = 0.5327 a day, cheaper than Pro — but Starter is cheaper because
  // it is capped, and badging that as value argues against the limits printed
  // on its own card. Only passes LONGER than the reference qualify.
  const notes = perDayValueNotes(ROW());
  assert.equal(notes.Starter, undefined);
  assert.equal(notes.Basic, undefined);
  assert.equal(notes.Pro, undefined);
});

test("no note while a live price is still loading", () => {
  const loading = ROW().map((p) => (p.name === "Ultimate" ? { ...p, priceState: "loading" } : p));
  assert.equal(perDayValueNotes(loading).Ultimate, undefined);
  const refLoading = ROW().map((p) => (p.name === "Pro" ? { ...p, priceState: "loading" } : p));
  assert.deepEqual(perDayValueNotes(refLoading), {});
});

test("the saving holds in the other display currencies", () => {
  // The same ratio, so the same percentage — which is the reason a percentage
  // is what gets shown rather than an amount per day.
  const eur = [card("Pro", "€18.39", 30, { featured: true }), card("Ultimate", "€45.99", 90)];
  assert.equal(perDayValueNotes(eur).Ultimate.percent, 17);
  const dzd = [card("Pro", "2700 DA", 30, { featured: true }), card("Ultimate", "6750 DA", 90)];
  assert.equal(perDayValueNotes(dzd).Ultimate.percent, 17);
});

test("a saving too small to matter is not shown", () => {
  const flat = [card("Pro", "$20", 30, { featured: true }), card("Ultimate", "$59", 90)];
  assert.equal(perDayValueNotes(flat).Ultimate, undefined); // 1.7 %, below the floor
});

test("no featured plan, no prices, nothing to divide — no notes and no crash", () => {
  assert.deepEqual(perDayValueNotes([]), {});
  assert.deepEqual(perDayValueNotes(ROW().map((p) => ({ ...p, featured: false }))), {});
  assert.deepEqual(perDayValueNotes([card("Pro", "gratuit", 30, { featured: true }), card("Ultimate", "$49.99", 90)]), {});
});

test("the live plans really do earn Ultimate its note", () => {
  // Guards the shipped fallback prices themselves: if a price edit ever made
  // the longest pass cost MORE per day than Pro, the card would quietly drop
  // its only argument for the higher figure instead of anyone noticing.
  const notes = perDayValueNotes(PLANS.map((p) => ({ ...p, priceState: "live" })));
  assert.ok(notes.Ultimate?.percent >= 5, "Ultimate should be cheaper by the day than Pro");
});
