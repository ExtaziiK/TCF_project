import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Public read-only endpoint: returns { [priceId]: { amount, currency, interval } }
// for the given comma-separated price ids, so the Pricing page always shows
// what Stripe will actually charge instead of a hand-typed number that can
// drift out of sync.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const ids = String(req.query.ids || "").split(",").filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: "Missing ids" });

  try {
    const prices = await Promise.all(ids.map((id) => stripe.prices.retrieve(id)));
    const byId = Object.fromEntries(
      prices.map((p) => [p.id, { amount: p.unit_amount, currency: p.currency, interval: p.recurring?.interval || null }])
    );
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.status(200).json(byId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
