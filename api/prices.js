import Stripe from "stripe";
import { enforceRateLimit } from "./_lib/ratelimit.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Public read-only endpoint: returns { [priceId]: { amount, currency, interval } }
// for the given comma-separated price ids, so the Pricing page always shows
// what Stripe will actually charge instead of a hand-typed number that can
// drift out of sync. Rate limited per IP (unauthenticated, proxies to the
// Stripe API) and capped to a handful of ids per request.
const MAX_IDS = 10;
const PRICE_ID_RE = /^price_[A-Za-z0-9]{8,64}$/;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await enforceRateLimit(req, { name: "prices", limit: 30, windowSeconds: 60 });
  } catch (err) {
    return res.status(err.status || 429).json({ error: err.message });
  }

  const ids = String(req.query.ids || "").split(",").filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: "Missing ids" });
  if (ids.length > MAX_IDS || !ids.every((id) => PRICE_ID_RE.test(id))) {
    return res.status(400).json({ error: "Invalid ids" });
  }

  try {
    const prices = await Promise.all(ids.map((id) => stripe.prices.retrieve(id)));
    const byId = Object.fromEntries(
      prices.map((p) => [p.id, { amount: p.unit_amount, currency: p.currency, interval: p.recurring?.interval || null }])
    );
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.status(200).json(byId);
  } catch (err) {
    console.error("prices:", err.message);
    res.status(500).json({ error: "Price lookup failed." });
  }
}
