// The DZD manual checkout is reached via nav("checkout-dz"), and nav() carries
// no params — so the plan the visitor picked on the Tarifs page is stashed here
// (sessionStorage, survives a reload/deep-link within the tab). The checkout
// page reads it on mount and bounces back to Tarifs if it's missing.
const KEY = "passerelle.dzCheckoutPlan";

export const setDzCheckoutPlan = (name) => {
  try { sessionStorage.setItem(KEY, name || ""); } catch { /* private mode */ }
};

export const getDzCheckoutPlan = () => {
  try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; }
};

// A promo code applied on the Tarifs page has to reach the DZD checkout too,
// or the buyer would be shown a discounted price on the cards and then asked
// to transfer the full amount. Stored beside the plan, and only ever a
// PERCENTAGE discount — a fixed-amount Stripe coupon is denominated in USD and
// cannot be subtracted from a dinar total (see discounted() in PlanCard).
const PROMO_KEY = "passerelle.dzCheckoutPromo";

export const setDzCheckoutPromo = (promo) => {
  try {
    if (promo?.code && promo?.percentOff) {
      sessionStorage.setItem(PROMO_KEY, JSON.stringify({ code: promo.code, percentOff: promo.percentOff }));
    } else sessionStorage.removeItem(PROMO_KEY);
  } catch { /* private mode */ }
};

export const getDzCheckoutPromo = () => {
  try {
    const raw = sessionStorage.getItem(PROMO_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p?.code && p?.percentOff ? p : null;
  } catch { return null; }
};

// A promo code entered BEFORE signing up. Buying needs an account, so a visitor
// who applies a code on the landing page is sent through registration in the
// middle of the purchase; this is what carries the code across that trip. Only
// the code string is kept — never the discount — so the value is always
// re-validated against Stripe rather than restored from something a user could
// edit in devtools.
//
// Distinct from the DZD pair above: that one survives one hop to the manual
// checkout page, this one survives a signup.
const PENDING_PROMO_KEY = "passerelle.pendingPromo";

export const setPendingPromo = (code) => {
  try {
    if (code) sessionStorage.setItem(PENDING_PROMO_KEY, String(code).slice(0, 64));
    else sessionStorage.removeItem(PENDING_PROMO_KEY);
  } catch { /* private mode */ }
};

export const getPendingPromo = () => {
  try { return sessionStorage.getItem(PENDING_PROMO_KEY) || ""; } catch { return ""; }
};
