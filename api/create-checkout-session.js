import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Creates a Stripe Checkout session for the authenticated Supabase user and
// returns its URL. The Supabase user id is attached to both the session and
// the resulting subscription (subscription_data.metadata) so the webhook can
// identify who to update without needing a separate customer-mapping table.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return res.status(401).json({ error: "Invalid session" });
  const user = userData.user;

  const { priceId, promoCode } = req.body || {};
  if (!priceId) return res.status(400).json({ error: "Missing priceId" });

  // A user whose Premium is still active must manage/upgrade through the
  // billing portal — starting a second Checkout would create a second live
  // subscription (double billing).
  const meta = user.app_metadata || {};
  const premiumActive =
    meta.plan === "Premium" && (!meta.premium_until || Date.parse(meta.premium_until) > Date.now());
  if (premiumActive) return res.status(400).json({ error: "already-subscribed" });

  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    // A code applied on the Pricing page is attached to the session directly;
    // otherwise Stripe's own promo-code field is enabled on the checkout page
    // (the two options are mutually exclusive in the Stripe API).
    let discounts = null;
    if (promoCode) {
      const { data } = await stripe.promotionCodes.list({ code: String(promoCode).trim().toUpperCase(), active: true, limit: 1 });
      if (!data[0]) return res.status(400).json({ error: "invalid-promo" });
      discounts = [{ promotion_code: data[0].id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      // Reuse the Stripe customer from a previous subscription (stored by the
      // webhook) so re-subscribing doesn't create a duplicate customer record.
      ...(meta.stripe_customer_id ? { customer: meta.stripe_customer_id } : { customer_email: user.email }),
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
