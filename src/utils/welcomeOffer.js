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

// The start of the window for a visitor who has no account yet.
//
// Re-stamped once the stored one has lapsed, so someone who comes back a week
// later is offered the 24 hours again rather than meeting a dead banner. What
// does NOT restart is a window they are already inside: moving from the
// landing page to Tarifs, or reloading, keeps counting the same deadline down
// instead of snapping back to 24:00:00 — a clock that resets under the visitor
// is the one thing that makes a countdown read as theatre.
//
// Once they register this stops being consulted at all. The account's own
// creation date takes over (welcomeOfferEndsAt), and that window is one-shot:
// nothing the browser does can restart it.
const FIRST_SEEN_KEY = "passerelle.firstSeen";

function visitorWindowStart() {
  const now = Date.now();
  try {
    const saved = Number(localStorage.getItem(FIRST_SEEN_KEY));
    if (Number.isFinite(saved) && saved > 0 && now - saved < WELCOME_WINDOW_MS) return saved;
    localStorage.setItem(FIRST_SEEN_KEY, String(now));
    return now;
  } catch {
    // Private mode: every visit looks like a first one. That is the harmless
    // direction to be wrong in — Stripe's own redemption limits on the code
    // are what actually cap it, and they follow the customer, not the browser.
    return now;
  }
}

// When the welcome window closes for this visitor, or null if it already has.
//
// Two clocks, and which one is running is the whole design:
//
//   - signed out — 24 hours from this visit, restarted if a previous one has
//     already lapsed. Nobody is being charged yet, so this is an invitation,
//     not a commitment.
//   - signed in — 24 hours from the account's creation, full stop. That is
//     server truth: it survives a cleared browser, a private window and a
//     second device, and it cannot be restarted. So the deadline that decides
//     what someone actually pays is the one that cannot be gamed, by them or
//     by us.
export function welcomeOfferEndsAt(user) {
  const created = Date.parse(user?.createdAt || "");
  const start = Number.isFinite(created) ? created : visitorWindowStart();
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
