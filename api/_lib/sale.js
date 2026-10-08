// A time-boxed sale applied to every plan FOR the buyer: nothing to type, and
// no other code accepted while it runs. Outside its window this module is
// inert — no banner, no forced discount, the promo field comes back — so
// ending a sale needs no deploy; starting the next one is editing SALE.
//
// Who enforces what:
//   - api/create-checkout-session.js attaches the sale coupon to every Stripe
//     session inside the window and ignores any code the browser sends (and
//     turns off Stripe's own code field), so the rule holds even against a
//     hand-made request. The coupon is created in Stripe on first use (id =
//     SALE.code), so there is nothing to set up in the dashboard.
//   - the pricing hook (src/hooks/usePricingSelection.js) pre-applies it on
//     the cards, the banner counts down to `endsAt`, and the promo fields
//     (Tarifs, landing page, dinar checkout) are locked.
//
// Dates are absolute instants: "Saturday 23:59" is Toronto time, like every
// other date on the site.
//
// Pure (no Node or browser APIs): shared by the server and the browser.
export const SALE = {
  code: "WEEKEND33",
  name: "Promo Weekend33",
  percentOff: 60,
  startsAt: Date.parse("2026-10-07T00:00:00-04:00"),
  endsAt: Date.parse("2026-10-10T23:59:59-04:00"),
};

export const saleActive = (now = Date.now()) => now >= SALE.startsAt && now < SALE.endsAt;

// The sale in the shape a validated Stripe promo has in the browser
// ({ code, percentOff, duration }), so the cards and the dinar checkout
// preview it with the code they already have.
export const salePromo = () => ({ code: SALE.code, percentOff: SALE.percentOff, duration: "once", sale: true });
