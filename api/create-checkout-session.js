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
      // Read first: the patch needs the current expiry so an upgrade cannot
      // shorten access that was already paid for.
      const { data } = await supabaseAdmin.auth.admin.getUserById(user.id);
      const currentMeta = data?.user?.app_metadata || {};
      const patch = await passPatchForSession(session, stripe, currentMeta);
      if (!patch) return res.status(400).json({ error: "invalid-price" });

      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...currentMeta, ...patch },
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
  const { plan, promoCode } = req.body || {};
  if (!isPassSlug(plan)) return res.status(400).json({ error: "invalid-plan" });


  // An active pass is no longer a reason to refuse a purchase: upgrading has to
  // be possible without waiting for the current one to lapse. The new window
  // runs from the moment of purchase and never shortens what is already there
  // (see passPatchForSession).
  const meta = user.app_metadata || {};

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
