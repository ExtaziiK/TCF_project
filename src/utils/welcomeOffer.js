// The new-account welcome offer: one promo code applied FOR the visitor, on
// every plan, for their first 24 hours.
//
// Only the window lives here. Whether the code exists at all, what it takes
// off, and how many times it may be redeemed are Stripe's answers — the
// pricing hook validates the code before anything is shown or applied, so
// ending the campaign is deleting TCF30 in Admin → Codes promo, not a deploy.
// Nothing here is trusted at checkout either: Stripe re-checks the code when
// the session is created, and a percentage is the only kind of discount the
// dinar checkout can honour (see discounted() in PlanCard).
export const WELCOME_PROMO_CODE = "TCF30";
export const WELCOME_WINDOW_MS = 24 * 60 * 60 * 1000;

// Stamped the first time a signed-out visitor reaches a page that offers
// plans. localStorage, not session: closing the tab and coming back an hour
// later must not restart the 24 hours.
const FIRST_SEEN_KEY = "passerelle.firstSeen";

function firstSeenAt() {
  try {
    const saved = Number(localStorage.getItem(FIRST_SEEN_KEY));
    if (Number.isFinite(saved) && saved > 0) return saved;
    const now = Date.now();
    localStorage.setItem(FIRST_SEEN_KEY, String(now));
    return now;
  } catch {
    // Private mode: every visit looks like the first one, so the offer keeps
    // showing. That is the harmless direction to be wrong in — Stripe's own
    // redemption limits on the code are what actually cap it, and they follow
    // the customer, not the browser.
    return Date.now();
  }
}

// When the welcome window closes for this visitor, or null if it already has.
//
// A signed-in account is anchored to its creation date: that is server truth,
// it survives a cleared browser, and it cannot be reset by wiping
// localStorage. Only a visitor with no account yet falls back to the local
// first-visit stamp — and once they register, the account's own clock takes
// over, which is what makes this an offer for new USERS rather than for new
// browsers.
export function welcomeOfferEndsAt(user) {
  const created = Date.parse(user?.createdAt || "");
  const start = Number.isFinite(created) ? created : firstSeenAt();
  const endsAt = start + WELCOME_WINDOW_MS;
  return endsAt > Date.now() ? endsAt : null;
}

// "07:04:59" — what is left, zero-padded so the digits don't jump around as
// the clock runs down.
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
