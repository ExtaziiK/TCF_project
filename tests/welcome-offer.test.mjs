// The 24-hour window behind the new-account offer (src/utils/welcomeOffer.js).
//
// What is asserted here is the part a visitor could otherwise grant themselves:
// a signed-in account is judged on its creation date — server truth — so
// clearing the browser, or opening a private window, cannot hand an account
// from last year a new-customer price. Only a visitor with no account yet is
// timed locally, and that stamp stops mattering the moment they register.
import { test } from "node:test";
import assert from "node:assert/strict";

const { welcomeOfferEndsAt, formatCountdown, WELCOME_WINDOW_MS, WELCOME_PROMO_CODE } =
  await import("../src/utils/welcomeOffer.js");

const agoISO = (ms) => new Date(Date.now() - ms).toISOString();
const HOUR = 60 * 60 * 1000;

test("the window is exactly 24 hours, and the code is the one the banner names", () => {
  assert.equal(WELCOME_WINDOW_MS, 24 * HOUR);
  assert.equal(WELCOME_PROMO_CODE, "TCF30");
});

test("an account created an hour ago still has 23 hours of offer", () => {
  const endsAt = welcomeOfferEndsAt({ createdAt: agoISO(HOUR) });
  assert.ok(endsAt, "the offer is still open");
  const left = endsAt - Date.now();
  assert.ok(left > 22.9 * HOUR && left <= 23 * HOUR, `23 h expected, got ${left / HOUR} h`);
});

test("an account older than 24 hours gets nothing — no offer to expire, no clock", () => {
  assert.equal(welcomeOfferEndsAt({ createdAt: agoISO(24 * HOUR + 1000) }), null);
  assert.equal(welcomeOfferEndsAt({ createdAt: agoISO(400 * 24 * HOUR) }), null);
});

test("the account's own clock wins over anything the browser remembers", () => {
  // No localStorage in node, so the anonymous fallback is "this instant" —
  // i.e. the most generous answer there is. An old account must not get it.
  assert.equal(welcomeOfferEndsAt({ createdAt: agoISO(48 * HOUR) }), null);
});

test("a visitor with no account is timed from this visit", () => {
  const endsAt = welcomeOfferEndsAt(null);
  assert.ok(endsAt - Date.now() > 23.9 * HOUR);
});

test("a missing or unparseable creation date falls back rather than crashing", () => {
  assert.ok(welcomeOfferEndsAt({ createdAt: null }));
  assert.ok(welcomeOfferEndsAt({ createdAt: "not a date" }));
});

test("the countdown is zero-padded, so the digits don't shift as it runs down", () => {
  assert.equal(formatCountdown(23 * HOUR + 59 * 60 * 1000 + 59_000), "23:59:59");
  assert.equal(formatCountdown(7 * HOUR + 4 * 60 * 1000 + 9_000), "07:04:09");
  assert.equal(formatCountdown(9_000), "00:00:09");
});

test("a deadline already past reads as zero, never as a negative countdown", () => {
  assert.equal(formatCountdown(-5_000), "00:00:00");
  assert.equal(formatCountdown(0), "00:00:00");
});
