// The passes we sell, keyed by a slug that never changes.
//
// A Stripe Price is immutable in its amount, so re-pricing always means
// creating a NEW price with a new id. Hard-coding those ids — as this file used
// to — meant every price change was a code change and a deploy, and getting the
// four ids out of sync with Stripe broke checkout outright.
//
// Prices therefore carry a stable `lookup_key` instead. Creating the
// replacement with `transfer_lookup_key: true` moves the key off the old price
// onto the new one, so the key always points at the current price and nothing
// here needs editing. That is what makes the admin Tarifs tab possible.
//
// `days` still lives here rather than in Stripe: a one-time price has no
// billing period, so the access window has to come from our own table. It is
// the single place deciding how long a purchase grants.
//
// The client sends a SLUG ("passeport"), never a Stripe id — so no Stripe
// identifier ships in the browser bundle, and the server picks from this
// allow-list rather than trusting whatever arrived.
export const PASSES = {
  passeport: {
    label: "Passeport",
    days: 5,
    lookupKey: "pass_passeport",
    // The price these keys were introduced against. Used only to attach the
    // lookup key the first time (see resolvePassPrice); once attached, the key
    // is authoritative and this is dead weight that can be deleted.
    bootstrapPriceId: "price_1Txu9yFzf0ilrkDnvsHPE0oy",
  },
  visa: {
    label: "Visa",
    days: 15,
    lookupKey: "pass_visa",
    bootstrapPriceId: "price_1Txu9uFzf0ilrkDnXXgHJiAG",
  },
  "premiere-classe": {
    label: "Première classe",
    days: 30,
    lookupKey: "pass_premiere_classe",
    bootstrapPriceId: "price_1Txu9uFzf0ilrkDni2sOGNO5",
  },
  vip: {
    label: "VIP",
    days: 90,
    lookupKey: "pass_vip",
    bootstrapPriceId: "price_1Txu9vFzf0ilrkDnltQg1Fbc",
  },
};

export const PASS_SLUGS = Object.keys(PASSES);
export const isPassSlug = (slug) => typeof slug === "string" && Object.prototype.hasOwnProperty.call(PASSES, slug);

// Both grant paths accept these. "no_payment_required" is a session settled
// entirely by a 100 %-off promotion code — it never charges the card, so it is
// never reported as "paid". "unpaid" is refused: that is an asynchronous method
// before the funds arrive.
export const GRANTABLE_PAYMENT_STATUSES = ["paid", "no_payment_required"];

// The live Price for a pass, found by its lookup key.
//
// Self-migrating: the keys did not exist when these prices were created, so on
// the first call the lookup returns nothing and we fall back to the id recorded
// above and attach the key to it. `lookup_key` is one of the few mutable fields
// on a Price, which is what makes that possible without recreating anything.
// After that first call the fallback is never used again.
//
// Returns null when the pass cannot be resolved, so callers refuse the sale
// rather than guessing at a price.
export async function resolvePassPrice(stripe, slug) {
  const pass = PASSES[slug];
  if (!pass) return null;

  const found = await stripe.prices.list({ lookup_keys: [pass.lookupKey], active: true, limit: 1 });
  if (found.data[0]) return found.data[0];

  if (!pass.bootstrapPriceId) return null;
  const price = await stripe.prices.retrieve(pass.bootstrapPriceId).catch(() => null);
  if (!price || !price.active) return null;
  try {
    return await stripe.prices.update(price.id, { lookup_key: pass.lookupKey });
  } catch (err) {
    // Key not attached (already taken by an archived price, permissions…).
    // The sale can still proceed on the price we found; the next call retries.
    console.warn(`passes: could not attach ${pass.lookupKey} to ${price.id}: ${err.message}`);
    return price;
  }
}

// When a pass bought at `from` should expire.
export function passExpiryISO(slug, from = Date.now()) {
  const pass = PASSES[slug];
  if (!pass) return null;
  return new Date(from + pass.days * 24 * 60 * 60 * 1000).toISOString();
}

// The app_metadata patch granting a completed Checkout session's pass.
//
// Shared by the two things that can grant one — the webhook and the browser's
// confirmation on return — so they cannot drift. IDEMPOTENT: the expiry counts
// from the session's creation time, not "now", so applying it twice yields the
// same premium_until and a client cannot extend its own access by confirming
// repeatedly.
//
// The slug comes from the session metadata we set at creation. Falling back to
// the line item's lookup key covers a session created before this change.
export async function passPatchForSession(session, stripe) {
  let slug = session.metadata?.plan;
  if (!isPassSlug(slug)) {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1, expand: ["data.price"] });
    const key = items.data[0]?.price?.lookup_key;
    slug = PASS_SLUGS.find((s) => PASSES[s].lookupKey === key);
  }
  const pass = isPassSlug(slug) ? PASSES[slug] : null;
  if (!pass) return null;
  return {
    plan: "Premium",
    plan_label: pass.label,
    premium_until: passExpiryISO(slug, (session.created || Math.floor(Date.now() / 1000)) * 1000),
    stripe_customer_id: session.customer,
    // A pass has no subscription; clear any id left by the old recurring model.
    stripe_subscription_id: null,
  };
}
