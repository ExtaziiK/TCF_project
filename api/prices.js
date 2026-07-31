import Stripe from "stripe";
import { enforceRateLimit } from "./_lib/ratelimit.js";
import { PASS_SLUGS, resolvePassPrice } from "./_lib/passes.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Public read-only endpoint: the live amount of each pass, keyed by PLAN SLUG.
//
//   GET /api/prices  →  { passeport: { amount, currency }, visa: {…}, … }
//
// It used to take a list of Stripe price ids from the querystring, which meant
// the ids had to ship in the browser bundle and be edited on every re-pricing.
// Prices are now found by their lookup key (see _lib/passes.js), so the client
// asks for "the passes" and gets whatever they currently cost — a price change
// in Stripe shows up here with no deploy.
//
// Rate limited per IP (unauthenticated, proxies to the Stripe API). Cached at
// the edge for five minutes: long enough to absorb traffic, short enough that a
// price change made in the admin Tarifs tab is visible almost immediately.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await enforceRateLimit(req, { name: "prices", limit: 30, windowSeconds: 60 });
  } catch (err) {
    return res.status(err.status || 429).json({ error: err.message });
  }

  try {
    const entries = await Promise.all(
      PASS_SLUGS.map(async (slug) => {
        const price = await resolvePassPrice(stripe, slug).catch(() => null);
        // A pass that cannot be resolved is omitted rather than reported as
        // free: the Pricing page then keeps its hand-written figure, which is
        // wrong-but-plausible instead of "$0".
        return price ? [slug, { amount: price.unit_amount, currency: price.currency }] : null;
      }),
    );
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.status(200).json(Object.fromEntries(entries.filter(Boolean)));
  } catch (err) {
    console.error("prices:", err.message);
    res.status(500).json({ error: "Price lookup failed." });
  }
}
