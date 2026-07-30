import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { enforceRateLimit } from "./_lib/ratelimit.js";
import { isSellablePass } from "./_lib/passes.js";

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

  try {
    await enforceRateLimit(req, { name: "checkout", limit: 5, windowSeconds: 60, userId: user.id });
  } catch (err) {
    return res.status(err.status || 429).json({ error: err.message });
  }

  const { priceId, promoCode, withdrawalWaiver, termsVersion } = req.body || {};
  if (!priceId || typeof priceId !== "string" || !/^price_[A-Za-z0-9]{8,64}$/.test(priceId)) {
    return res.status(400).json({ error: "Missing priceId" });
  }

  // CGU section 7 makes a started pass non-refundable on the footing that the
  // buyer expressly asked for immediate access and acknowledged losing the
  // withdrawal right. That has to be obtained, not merely asserted in the
  // contract, so no session is created without it — enforced here rather than
  // only in the UI, since the endpoint is callable directly.
  if (withdrawalWaiver !== true) return res.status(400).json({ error: "waiver-required" });

  // A user whose Premium is still active must manage/upgrade through the
  // billing portal — starting a second Checkout would create a second live
  // subscription (double billing).
  const meta = user.app_metadata || {};
  const premiumActive =
    meta.plan === "Premium" && (!meta.premium_until || Date.parse(meta.premium_until) > Date.now());
  if (premiumActive) return res.status(400).json({ error: "already-subscribed" });

  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    // Only sell what the Pricing page sells: the price must be one of our
    // passes, exist, be active, and be a ONE-TIME price. Without this check any
    // price id in the Stripe account (legacy subscription plans, test prices)
    // could be checked out by calling the endpoint directly.
    //
    // one_time, not recurring: a pass is a single purchase opening Premium for a
    // fixed window (PASSES), which is what the CGU promises. A recurring price
    // here would rebill the customer against a contract that says it won't.
    if (!isSellablePass(priceId)) return res.status(400).json({ error: "invalid-price" });
    const price = await stripe.prices.retrieve(priceId).catch(() => null);
    if (!price || !price.active || price.type !== "one_time") {
      return res.status(400).json({ error: "invalid-price" });
    }

    // Record the acknowledgement before handing the buyer to Stripe, so the
    // evidence exists for every session that could result in a charge. Stamped
    // from the request headers here — the browser never supplies them (see the
    // 20260731 migration). Best effort by design: if the table is missing
    // (migration not yet applied) the purchase still proceeds rather than
    // failing over bookkeeping, and the console line is the signal to apply it.
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const { error: waiverError } = await supabaseAdmin.from("withdrawal_waivers").insert({
      user_id: user.id,
      terms_version: typeof termsVersion === "string" && termsVersion.length <= 40 ? termsVersion : "unknown",
      price_id: priceId,
      channel: "stripe",
      ip: forwarded || null,
      user_agent: String(req.headers["user-agent"] || "").slice(0, 300) || null,
    });
    if (waiverError) console.error("withdrawal waiver not recorded:", waiverError.message);

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
      // A pass is bought once. `payment` mode creates no subscription, so
      // nothing can renew — which is what makes section 6 true. There is
      // consequently no subscription_data: it is rejected outside subscription
      // mode, and the price id in metadata is what the webhook reads to work
      // out the access window instead of a billing period.
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      // Reuse the Stripe customer from an earlier purchase (stored by the
      // webhook) so buying again doesn't create a duplicate customer record.
      ...(meta.stripe_customer_id ? { customer: meta.stripe_customer_id } : { customer_email: user.email }),
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      metadata: { supabase_user_id: user.id, price_id: priceId },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session:", err.message);
    // A discount Stripe won't accept — most often a fixed-amount coupon whose
    // currency doesn't match the price — is the customer's problem to solve
    // (remove the code), not a server outage. Surfacing it as invalid-promo
    // gets them the actionable message instead of "réessayez", which would
    // never succeed.
    if (promoCode && /coupon|promotion|currency|discount/i.test(err.message || "")) {
      return res.status(400).json({ error: "invalid-promo" });
    }
    res.status(500).json({ error: "Checkout failed." });
  }
}
