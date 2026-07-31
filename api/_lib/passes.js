// The passes we sell, server-side. One-time purchases, each opening Premium for
// a fixed number of days — the model CGU section 6 describes ("Chaque pass est
// un achat unique… Il n'y a pas de reconduction tacite").
//
// Keep in sync with src/constants/pricing.js, which is the same table for the
// browser. Duplicated rather than imported on purpose: api/ functions bundle
// separately from the client, and pulling a src/constants module in would drag
// client-only imports into a serverless function.
//
// `days` lives here, not in Stripe: a one-time price has no billing period, so
// the access window has to come from our own table. It is the single place that
// decides how long a purchase grants — the webhook reads it to compute
// premium_until, and the checkout endpoint uses the keys as its allow-list.
export const PASSES = {
  price_1Txu9yFzf0ilrkDnvsHPE0oy: { label: "Passeport", days: 5 },
  price_1Txu9uFzf0ilrkDnXXgHJiAG: { label: "Visa", days: 15 },
  price_1Txu9uFzf0ilrkDni2sOGNO5: { label: "Première classe", days: 30 },
  price_1Txu9vFzf0ilrkDnltQg1Fbc: { label: "VIP", days: 90 },
};

export const isSellablePass = (priceId) => Object.prototype.hasOwnProperty.call(PASSES, priceId);

// When a pass bought at `from` should expire.
export function passExpiryISO(priceId, from = Date.now()) {
  const pass = PASSES[priceId];
  if (!pass) return null;
  return new Date(from + pass.days * 24 * 60 * 60 * 1000).toISOString();
}

// The app_metadata patch that grants a completed Checkout session's pass.
//
// Shared by the two things that can grant one — the webhook, and the
// confirmation the browser asks for on return from Stripe — so they cannot
// drift apart. Whichever arrives first wins and the other is a no-op, because
// the result is IDEMPOTENT: the expiry is counted from the session's own
// creation time, not from "now", so applying it twice (or ten times) yields
// exactly the same premium_until. Counting from now would let a client extend
// its own access by asking to confirm repeatedly.
//
// Returns null when the session is not a grantable pass, so callers can log and
// skip rather than half-applying something.
export async function passPatchForSession(session, stripe) {
  const priceId = session.metadata?.price_id
    || (await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })).data[0]?.price?.id;
  const pass = priceId ? PASSES[priceId] : null;
  if (!pass) return null;
  return {
    plan: "Premium",
    plan_label: pass.label,
    premium_until: passExpiryISO(priceId, (session.created || Math.floor(Date.now() / 1000)) * 1000),
    stripe_customer_id: session.customer,
    // A pass has no subscription; clear any id left by the old recurring model.
    stripe_subscription_id: null,
  };
}

// Both grant paths accept these. "no_payment_required" is a session settled
// entirely by a 100 %-off promotion code — it never charges the card, so it is
// never reported as "paid". "unpaid" is refused: that is an asynchronous method
// before the funds arrive.
export const GRANTABLE_PAYMENT_STATUSES = ["paid", "no_payment_required"];
