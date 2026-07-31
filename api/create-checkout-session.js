import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { enforceRateLimit } from "./_lib/ratelimit.js";
import { isPassSlug, resolvePassPrice, passPatchForSession, GRANTABLE_PAYMENT_STATUSES } from "./_lib/passes.js";

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

  // ── Confirm a completed session ────────────────────────────────────────────
  // Called by the browser the moment Stripe redirects back, instead of waiting
  // for the webhook to race it. The webhook is asynchronous, so polling for it
  // from the client meant the buyer watched a free-looking account for seconds
  // and reached for refresh. Here the answer is definitive in one round trip;
  // the webhook stays as the safety net for a buyer who closes the tab.
  //
  // Lives in this function rather than its own: Vercel Hobby caps a deployment
  // at 12 functions and api/ is already at 12 (see api/admin/[resource].js).
  if (req.body?.sessionId) {
    const sessionId = String(req.body.sessionId);
    if (!/^cs_[A-Za-z0-9_]{8,120}$/.test(sessionId)) return res.status(400).json({ error: "invalid-session" });
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // Ownership check: the session must be the caller's own. Without it,
      // anyone holding a session id could have its pass applied to their
      // account — session ids travel in URLs and get pasted around.
      const owner = session.client_reference_id || session.metadata?.supabase_user_id;
      if (owner !== user.id) return res.status(403).json({ error: "not-your-session" });
      if (!GRANTABLE_PAYMENT_STATUSES.includes(session.payment_status)) {
        return res.status(202).json({ ok: false, pending: true });
      }
      const patch = await passPatchForSession(session, stripe);
      if (!patch) return res.status(400).json({ error: "invalid-price" });

      const { data } = await supabaseAdmin.auth.admin.getUserById(user.id);
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...(data?.user?.app_metadata || {}), ...patch },
      });
      return res.status(200).json({ ok: true, plan: patch.plan, planLabel: patch.plan_label, premiumUntil: patch.premium_until });
    } catch (err) {
      console.error("confirm-checkout:", err.message);
      return res.status(500).json({ error: "confirm-failed" });
    }
  }

  // The client names a PLAN ("passeport"), not a Stripe price. The id is
  // resolved here from the pass's lookup key, so re-pricing in Stripe needs no
  // deploy and no Stripe identifier reaches the browser.
  const { plan, promoCode, withdrawalWaiver, termsVersion } = req.body || {};
  if (!isPassSlug(plan)) return res.status(400).json({ error: "invalid-plan" });

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
    // Resolve the plan to its current live price via its lookup key. one_time,
    // not recurring: a pass is a single purchase opening Premium for a fixed
    // window, which is what the CGU promises. A recurring price here would
    // rebill the customer against a contract saying it will not.
    const price = await resolvePassPrice(stripe, plan);
    if (!price || !price.active || price.type !== "one_time") {
      return res.status(400).json({ error: "invalid-price" });
    }
    const priceId = price.id;

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
      metadata: { supabase_user_id: user.id, plan, price_id: priceId },
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
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
