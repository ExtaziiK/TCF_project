// The dictée's per-tâche allowance (api/_lib/auth.js → dailyDicteesFor) and the
// promise the plan cards make about it (src/constants/pricing.js).
//
// Two things are worth holding down here, and neither is testable by using the
// site:
//
//   1. THE LEGACY LABELS. A user's plan_label is frozen at checkout, so the
//      accounts sold before the 2026-08 rename still carry "visa", "premiere
//      classe" and "vip". Dropping one of those from the map does not fail
//      anywhere — it silently falls through to "unlimited", which is the safe
//      direction for a customer and the expensive one for us, and nobody
//      notices for a month.
//
//   2. THE CARD AND THE CODE. Starter's card sells a number. If the map and the
//      card ever disagree, the candidate is refused a dictation they paid for,
//      which arrives as a support ticket rather than as a failing build.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test";

const { dailyDicteesFor, DICTEE_BURST, DICTEE_PAUSE_MINUTES } = await import("../api/_lib/auth.js");
const { PLANS } = await import("../src/constants/pricing.js");

const withLabel = (plan_label, extra = {}) => ({ app_metadata: { plan_label, ...extra } });

test("Starter is capped at 3 a day per tâche, under either of its labels", () => {
  assert.equal(dailyDicteesFor(withLabel("starter")), 3);
  assert.equal(dailyDicteesFor(withLabel("visa")), 3); // sold before the rename
  assert.equal(dailyDicteesFor(withLabel("Starter")), 3); // as stored, capitalised
});

test("Pro and Ultimate are uncapped, under either of their labels", () => {
  for (const label of ["pro", "premiere classe", "Première classe", "ultimate", "vip"]) {
    assert.equal(dailyDicteesFor(withLabel(label)), null, `${label} should be uncapped`);
  }
});

test("the discontinued Passeport keeps a cap rather than falling through to unlimited", () => {
  assert.equal(dailyDicteesFor(withLabel("passeport")), 3);
});

test("an unrecognised label and the back office are uncapped", () => {
  // Fail open: a paying customer whose label we cannot match is served.
  assert.equal(dailyDicteesFor(withLabel("forfait-de-2027")), null);
  assert.equal(dailyDicteesFor(withLabel(undefined)), null);
  assert.equal(dailyDicteesFor(withLabel("starter", { role: "admin" })), null);
  assert.equal(dailyDicteesFor(withLabel("starter", { role: "owner" })), null);
  assert.equal(dailyDicteesFor(null), null);
});

/* ------------------------- what the cards promise ------------------------- */

const cardFor = (name) => PLANS.find((p) => p.name === name);
const dicteeLine = (name) => cardFor(name).feats.find((f) => /dictée/i.test(f));

test("every paid plan says something about the dictée", () => {
  for (const name of ["Starter", "Pro", "Ultimate"]) {
    assert.ok(dicteeLine(name), `${name} should advertise the dictée`);
  }
  // The free tier must NOT: the exercise is Premium (src/auth/rbac.js, and
  // api/dictee.js → requirePremium), so a line here would sell what a Basic
  // account cannot open.
  assert.equal(dicteeLine("Basic"), undefined);
});

test("Starter's card prints the number the server actually enforces", () => {
  const enforced = dailyDicteesFor(withLabel("starter"));
  const line = dicteeLine("Starter");
  assert.match(line, new RegExp(`\\b${enforced}\\b`), `Starter's dictée line should quote ${enforced}`);
  assert.doesNotMatch(line, /sans limite|illimit/i);
});

test("the uncapped cards say so, and neither mentions the pause", () => {
  for (const name of ["Pro", "Ultimate"]) {
    assert.equal(dailyDicteesFor(withLabel(name.toLowerCase())), null);
    assert.match(dicteeLine(name), /sans limite/i);
  }
  // The fifteen-minute break is study advice, not an entitlement, and is
  // deliberately unadvertised — a card that mentioned it would be selling a
  // limit that the plan does not have.
  const everyFeat = PLANS.flatMap((p) => p.feats).join(" ");
  assert.doesNotMatch(everyFeat, new RegExp(`${DICTEE_BURST}\\s+dictées`, "i"));
  assert.doesNotMatch(everyFeat, new RegExp(`${DICTEE_PAUSE_MINUTES}\\s*minutes`, "i"));
});
