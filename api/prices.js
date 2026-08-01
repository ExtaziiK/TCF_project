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
// Rate limited per IP (unauthenticated, proxies to the Stripe API), and cached
// briefly — see the header below for why the window is as short as it is.
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
    // Short on purpose. Each call costs four Stripe lookups, so some caching is
    // needed to keep Stripe out of the hot path — but prices are now edited
    // from the admin Tarifs tab, and the previous 5 min + 1 h stale-while-
    // revalidate made a change look like it had not applied at all. A minute is
    // enough to absorb a traffic burst without the panel appearing broken.
    // The admin panel reads /api/admin/pricing, which is never cached, so it
    // always shows the true current price.
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    res.status(200).json(Object.fromEntries(entries.filter(Boolean)));
  } catch (err) {
    console.error("prices:", err.message);
    res.status(500).json({ error: "Price lookup failed." });
  }
}
