import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Public promo-code check for the Pricing page: returns the discount a code
// grants so the UI can show it before checkout. Promo codes are meant to be
// shared, so exposing validity isn't a leak; the actual redemption (usage
// caps, expiry, one-per-customer) is enforced by Stripe at checkout time.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const code = String(req.query.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ valid: false });

  try {
    const { data } = await stripe.promotionCodes.list({ code, active: true, limit: 1, expand: ["data.promotion.coupon"] });
    const pc = data[0];
    const exhausted = pc?.max_redemptions && pc.times_redeemed >= pc.max_redemptions;
    const expired = pc?.expires_at && pc.expires_at * 1000 < Date.now();
    res.setHeader("Cache-Control", "no-store");
    if (!pc || exhausted || expired) return res.status(200).json({ valid: false });
    // Since API 2025+, the coupon is nested under `promotion.coupon` (expanded above).
    const coupon = typeof pc.promotion?.coupon === "object" ? pc.promotion.coupon : null;
    res.status(200).json({
      valid: true,
      code: pc.code,
      percentOff: coupon?.percent_off || null,
      amountOff: coupon?.amount_off || null,
      currency: coupon?.currency || null,
      duration: coupon?.duration || "once",
      durationInMonths: coupon?.duration_in_months || null,
    });
  } catch {
    res.status(200).json({ valid: false });
  }
}
