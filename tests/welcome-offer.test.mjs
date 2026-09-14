// The two clocks behind the new-account offer (src/utils/welcomeOffer.js).
//
// Which one is running is the whole design, and it is what is asserted here:
// a signed-out visitor is offered 24 hours from this visit and offered them
// again if a previous window has lapsed — nobody is being charged yet. A
// signed-in account is judged on its creation date, which is server truth, so
// clearing the browser or opening a private window cannot hand a year-old
// account a new-customer price. The deadline that decides what someone
// actually pays is the one nothing local can restart.
import { test } from "node:test";
import assert from "node:assert/strict";

// node has no localStorage, and the module reads it lazily inside the
// function, so a stub installed here is what the visitor path will see.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const KEY = "passerelle.firstSeen";

const { welcomeOfferEndsAt, formatCountdown, WELCOME_WINDOW_MS, WELCOME_PROMO_CODE } =
  await import("../src/utils/welcomeOffer.js");

const HOUR = 60 * 60 * 1000;
const agoISO = (ms) => new Date(Date.now() - ms).toISOString();
const stamp = (ms) => store.set(KEY, String(Date.now() - ms));
const hoursLeft = (endsAt) => (endsAt - Date.now()) / HOUR;

test("the window is 24 hours, and the code is the one the banner names", () => {
  assert.equal(WELCOME_WINDOW_MS, 24 * HOUR);
  assert.equal(WELCOME_PROMO_CODE, "TCF30");
});

/* ── signed out ──────────────────────────────────────────────────────── */

test("a first-time visitor gets the full 24 hours, counted from this visit", () => {
  store.clear();
  assert.ok(hoursLeft(welcomeOfferEndsAt(null)) > 23.9);
  assert.ok(store.has(KEY), "the visit is stamped, so the next page keeps counting down");
});

test("a window already running is NOT restarted by navigating or reloading", () => {
  store.clear();
  stamp(3 * HOUR);
  const before = store.get(KEY);
  const left = hoursLeft(welcomeOfferEndsAt(null));
  assert.ok(left > 20.9 && left <= 21, `21 h expected, got ${left} h`);
  assert.equal(store.get(KEY), before, "the deadline must not snap back to 24:00:00 under them");
});

test("a lapsed window is offered again — a visitor back a week later meets a live banner", () => {
  store.clear();
  stamp(7 * 24 * HOUR);
  assert.ok(hoursLeft(welcomeOfferEndsAt(null)) > 23.9);
  assert.ok(Date.now() - Number(store.get(KEY)) < 5_000, "re-stamped to now");
});

/* ── signed in ───────────────────────────────────────────────────────── */

test("registering starts a fresh 24 hours, whatever the browser was counting", () => {
  store.clear();
  stamp(20 * HOUR); // mid-visit when they signed up
  const left = hoursLeft(welcomeOfferEndsAt({ createdAt: agoISO(60_000) }));
  assert.ok(left > 23.9, `the account's own clock takes over, got ${left} h`);
});

test("an account past 24 hours gets nothing, and no local stamp can revive it", () => {
  store.clear();
  assert.equal(welcomeOfferEndsAt({ createdAt: agoISO(24 * HOUR + 1000) }), null);
  store.set(KEY, String(Date.now())); // a freshly cleared browser
  assert.equal(welcomeOfferEndsAt({ createdAt: agoISO(400 * 24 * HOUR) }), null);
});

test("an account an hour old still has 23 hours", () => {
  const left = hoursLeft(welcomeOfferEndsAt({ createdAt: agoISO(HOUR) }));
  assert.ok(left > 22.9 && left <= 23, `23 h expected, got ${left} h`);
});

test("a missing or unparseable creation date falls back rather than crashing", () => {
  assert.ok(welcomeOfferEndsAt({ createdAt: null }));
  assert.ok(welcomeOfferEndsAt({ createdAt: "not a date" }));
});

test("storage that throws (private mode) still yields an offer, never a crash", () => {
  const real = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.ok(hoursLeft(welcomeOfferEndsAt(null)) > 23.9);
  globalThis.localStorage = real;
});

/* ── the clock itself ────────────────────────────────────────────────── */

test("the countdown is zero-padded, so the digits don't shift as it runs down", () => {
  assert.equal(formatCountdown(23 * HOUR + 59 * 60 * 1000 + 59_000), "23:59:59");
  assert.equal(formatCountdown(7 * HOUR + 4 * 60 * 1000 + 9_000), "07:04:09");
  assert.equal(formatCountdown(9_000), "00:00:09");
});

test("a deadline already past reads as zero, never as a negative countdown", () => {
  assert.equal(formatCountdown(-5_000), "00:00:00");
  assert.equal(formatCountdown(0), "00:00:00");
});
