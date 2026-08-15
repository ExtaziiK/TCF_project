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
