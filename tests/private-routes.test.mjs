// Person-scoped routes (rbac.PRIVATE_ROUTE_EMAILS).
//
// Every other rule in rbac.js gates on what someone IS. This one gates on who
// they are, and it is the only place in the app where being signed in and
// paying is not enough. It is worth a test because the failure is silent: a
// broken predicate does not throw, it just quietly shows one person's private
// page to somebody else.
//
// rbac.js is dependency-free, so it loads under plain `node --test` without
// Vite's alias resolution. Note this covers the CLIENT-side gate only — the
// authoritative one is the RLS policy in 20260820_tcf_watch.sql, which applies
// the same email rule in the database.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { canAccess, deniedReason, ROLES, PRIVATE_ROUTE_EMAILS, PAGE_ACCESS } =
  await import(pathToFileURL(path.join(root, "src", "auth", "rbac.js")).href);

const OWNER_EMAIL = "elouchtati@gmail.com";
const ROUTE = "veille-tcf";

test("the watch route is scoped to one person plus staff", () => {
  const owner = { email: OWNER_EMAIL };
  const other = { email: "someone.else@gmail.com" };

  assert.equal(canAccess(ROLES.FREE_USER, ROUTE, owner), true, "the candidate it belongs to gets in");
  assert.equal(canAccess(ROLES.PREMIUM_USER, ROUTE, owner), true, "…on any plan");
  assert.equal(canAccess(ROLES.ADMIN, ROUTE, other), true, "staff keep access, as everywhere else");
  assert.equal(canAccess(ROLES.OWNER, ROUTE, other), true, "owner is a superset of admin");

  assert.equal(canAccess(ROLES.FREE_USER, ROUTE, other), false, "another signed-in user must not get in");
  assert.equal(canAccess(ROLES.PREMIUM_USER, ROUTE, other), false, "paying does not buy access");
  assert.equal(canAccess(ROLES.VISITOR, ROUTE, null), false, "a visitor has no email at all");
  assert.equal(canAccess(ROLES.FREE_USER, ROUTE, undefined), false, "a missing user object is not a pass");
  assert.equal(canAccess(ROLES.FREE_USER, ROUTE, {}), false, "nor is a user with no email");
});

test("the email comparison cannot be tricked by case or padding", () => {
  for (const email of [OWNER_EMAIL.toUpperCase(), `  ${OWNER_EMAIL}  `, "ElOuChTaTi@Gmail.com"]) {
    assert.equal(canAccess(ROLES.FREE_USER, ROUTE, { email }), true, `"${email}" is the same person`);
  }
  // But a lookalike is not the same person.
  for (const email of ["elouchtati@gmail.com.evil.com", "xelouchtati@gmail.com", "elouchtati@gmail.co"]) {
    assert.equal(canAccess(ROLES.FREE_USER, ROUTE, { email }), false, `"${email}" is somebody else`);
  }
});

test("being the right person still does not bypass the role policy", () => {
  // The route is AUTHENTICATED as well as person-scoped; a signed-out session
  // must fail on the role check before the email is ever consulted.
  assert.equal(PAGE_ACCESS[ROUTE].includes(ROLES.VISITOR), false, "the route is not public");
  assert.equal(canAccess(ROLES.VISITOR, ROUTE, { email: OWNER_EMAIL }), false);
});

test("denial reads as 403, never as an upgrade pitch", () => {
  // Selling a subscription to someone who could never be granted this by paying
  // would be a lie, so a person-scoped route must not fall through to "upgrade".
  assert.equal(deniedReason(ROLES.FREE_USER, ROUTE, { email: "other@gmail.com" }), "forbidden");
  assert.equal(deniedReason(ROLES.PREMIUM_USER, ROUTE, { email: "other@gmail.com" }), "forbidden");
  assert.equal(deniedReason(ROLES.FREE_USER, ROUTE, { email: OWNER_EMAIL }), null, "no denial for the owner");
  assert.equal(deniedReason(ROLES.ADMIN, ROUTE, {}), null, "no denial for staff");
});

test("role-gated routes are untouched by the person rule", () => {
  // The `user` argument is optional and must not change any existing decision.
  assert.equal(canAccess(ROLES.PREMIUM_USER, "dictee"), true);
  assert.equal(canAccess(ROLES.FREE_USER, "dictee"), false);
  assert.equal(canAccess(ROLES.FREE_USER, "grammar"), true);
  assert.equal(canAccess(ROLES.ADMIN, "admin"), true);
  assert.equal(canAccess(ROLES.PREMIUM_USER, "admin"), false);
  assert.equal(canAccess(ROLES.VISITOR, "home"), true, "unlisted routes stay public");

  // And passing a user changes none of them.
  const u = { email: OWNER_EMAIL };
  assert.equal(canAccess(ROLES.FREE_USER, "dictee", u), false, "the allowlist is per-route, not global");
  assert.equal(canAccess(ROLES.FREE_USER, "admin", u), false);
});

test("every private route is also listed in PAGE_ACCESS", () => {
  // A route in PRIVATE_ROUTE_EMAILS but absent from PAGE_ACCESS would be public
  // to anyone whose email happens to match — including, for a signed-out
  // session, nobody at all, which hides the mistake until it matters.
  for (const route of Object.keys(PRIVATE_ROUTE_EMAILS)) {
    assert.ok(PAGE_ACCESS[route], `"${route}" is person-scoped but has no role policy`);
    assert.ok(PRIVATE_ROUTE_EMAILS[route].length > 0, `"${route}" has an empty allowlist`);
    for (const e of PRIVATE_ROUTE_EMAILS[route]) {
      assert.equal(e, e.trim().toLowerCase(), `"${e}" must be stored lowercase and trimmed to match`);
    }
  }
});
