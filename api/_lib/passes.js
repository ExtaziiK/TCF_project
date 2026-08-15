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
// The client sends a SLUG ("visa"), never a Stripe id — so no Stripe
// identifier ships in the browser bundle, and the server picks from this
// allow-list rather than trusting whatever arrived.
//
// Passeport was discontinued 2026-08 — deliberately absent below, which is
// what makes isPassSlug("passeport") false and refuses a NEW checkout for it
// (create-checkout-session.js). It is not a rename: someone who already holds
// a Passeport pass keeps it under that exact name until their 5 days run out —
// see DAILY_SITTINGS in auth.js, which still has a "passeport" entry for
// exactly that reason. Nothing here needs to keep tracking it once every
// holder's pass has expired.
//
// visa / premiere-classe / vip were RENAMED the same day (display label only —
// "Starter" / "Pro" / "Ultimate" in src/constants/pricing.js) without changing
// the KEYS below. The key is the checkout slug and the Stripe lookup key's
// stem — changing it would mean updating checkout URLs and Stripe together for
// zero user-visible benefit, since neither is ever shown. Only `label` (what
// gets written into a NEW purchaser's plan_label) changed. Existing holders'
// plan_label keeps whatever string was stored at THEIR checkout time (e.g.
// "Visa"), which is why auth.js's DAILY_SITTINGS and the device_limit_for() DB
// function both recognise the old AND the new label — two labels, one tier.
export const PASSES = {
  visa: {
    label: "Starter",
    days: 15,
    lookupKey: "pass_visa",
    bootstrapPriceId: "price_1Txu9uFzf0ilrkDnXXgHJiAG",
  },
  "premiere-classe": {
    label: "Pro",
    days: 30,
    lookupKey: "pass_premiere_classe",
    bootstrapPriceId: "price_1Txu9uFzf0ilrkDni2sOGNO5",
  },
  vip: {
    label: "Ultimate",
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
export async function passPatchForSession(session, stripe, currentMeta = {}) {
  let slug = session.metadata?.plan;
  if (!isPassSlug(slug)) {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1, expand: ["data.price"] });
    const key = items.data[0]?.price?.lookup_key;
    slug = PASS_SLUGS.find((s) => PASSES[s].lookupKey === key);
  }
  const pass = isPassSlug(slug) ? PASSES[slug] : null;
  if (!pass) return null;
  // The new pass runs from the moment it was bought, not from the end of
  // whatever was already there — buying an upgrade should not mean waiting for
  // the old pass to lapse first.
  const boughtAt = (session.created || Math.floor(Date.now() / 1000)) * 1000;
  const fresh = passExpiryISO(slug, boughtAt);
  // …but it never SHORTENS access. Someone with 80 days left who buys a 5-day
  // pass would otherwise pay to lose 75 days; keeping the later of the two
  // makes that impossible. Still idempotent: re-applying compares the same two
  // dates and picks the same winner.
  const existing = currentMeta?.premium_until ? Date.parse(currentMeta.premium_until) : NaN;
  const until = Number.isFinite(existing) && existing > Date.parse(fresh) ? currentMeta.premium_until : fresh;

  return {
    plan: "Premium",
    plan_label: pass.label,
    premium_until: until,
    stripe_customer_id: session.customer,
    // A pass has no subscription; clear any id left by the old recurring model.
    stripe_subscription_id: null,
  };
}
