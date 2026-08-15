// The 2026-08-09 plan rename (Visa/Première classe/VIP -> Starter/Pro/Ultimate;
// Passeport discontinued) touches label matching in several independent
// places. This file covers the checkout allow-list (api/_lib/passes.js) —
// server code, plain relative imports, importable here directly.
//
// The two client-side/DB-side copies of the same "old label OR new label"
// matching (src/hooks/useProfiles.js; device_limit_for() and
// max_learner_profiles() in the 20260809 migration) are NOT covered here:
// useProfiles.js imports through Vite's "@/" alias, which plain `node --test`
// cannot resolve without bundler infrastructure this project doesn't carry for
// tests, and the two DB functions have no test harness at all (checked
// manually against the migration in supabase/migrations/20260804_learner_profiles.sql
// and 20260724_multi_device_sessions.sql).
import { test } from "node:test";
import assert from "node:assert/strict";
import { PASSES, PASS_SLUGS, isPassSlug } from "../api/_lib/passes.js";
import { currentPlanLabel as currentPlanLabelServer } from "../api/_lib/planLabel.js";
import { currentPlanLabel as currentPlanLabelClient } from "../src/constants/pricing.js";

test("passeport is not a purchasable slug anymore", () => {
  assert.equal(isPassSlug("passeport"), false);
  assert.ok(!("passeport" in PASSES));
  assert.ok(!PASS_SLUGS.includes("passeport"));
});

test("the three remaining slugs are unchanged, only their label changed", () => {
  // The slug is the checkout identifier and the Stripe lookup-key stem —
  // renaming it would need a coordinated client+Stripe change for zero
  // user-visible benefit, since neither is ever displayed.
  assert.deepEqual(PASS_SLUGS.sort(), ["premiere-classe", "vip", "visa"]);
  assert.equal(PASSES.visa.label, "Starter");
  assert.equal(PASSES["premiere-classe"].label, "Pro");
  assert.equal(PASSES.vip.label, "Ultimate");
});

test("every remaining pass still has a lookup key and a valid access window (no accidental drop while editing)", () => {
  for (const slug of PASS_SLUGS) {
    assert.ok(PASSES[slug].lookupKey, `${slug} is missing its Stripe lookup key`);
    assert.ok(Number.isInteger(PASSES[slug].days) && PASSES[slug].days > 0, `${slug} is missing a valid access window`);
  }
});

// currentPlanLabel() exists in TWO places by design (api/ never imports from
// src/) — the server copy (api/_lib/planLabel.js, used by mailer.js and the
// admin API) and the client copy (src/constants/pricing.js, used by
// Profile.jsx, Nav.jsx and the admin UI). Run the same cases against both so
// they can never quietly drift apart.
for (const [where, currentPlanLabel] of [["server", currentPlanLabelServer], ["client", currentPlanLabelClient]]) {
  test(`currentPlanLabel (${where}) maps every renamed tier's legacy label to its current name`, () => {
    assert.equal(currentPlanLabel("Visa"), "Starter");
    assert.equal(currentPlanLabel("Première classe"), "Pro");
    assert.equal(currentPlanLabel("VIP"), "Ultimate");
  });

  test(`currentPlanLabel (${where}) passes an already-current label through unchanged`, () => {
    assert.equal(currentPlanLabel("Starter"), "Starter");
    assert.equal(currentPlanLabel("Pro"), "Pro");
    assert.equal(currentPlanLabel("Ultimate"), "Ultimate");
  });

  test(`currentPlanLabel (${where}) leaves a discontinued tier's label alone — there is no current name to map it to`, () => {
    assert.equal(currentPlanLabel("Passeport"), "Passeport");
  });

  test(`currentPlanLabel (${where}) passes null/undefined through so the caller's own "|| \\"Premium\\"" fallback still applies`, () => {
    assert.equal(currentPlanLabel(null), null);
    assert.equal(currentPlanLabel(undefined), undefined);
  });
}
