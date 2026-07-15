import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";

// Promo code management (admin only). Codes live in Stripe — a Coupon holds
// the discount, a Promotion Code is its customer-facing name — so redemption,
// expiry and usage counting are enforced by Stripe at checkout, not by us.
//
//   GET  /api/admin/promo                    → { codes: [...] }
//   POST /api/admin/promo { action: "create", code, percentOff|amountOff,
//                           duration, durationInMonths?, maxRedemptions?, expiresAt? }
//   POST /api/admin/promo { action: "toggle", id, active }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CODE_RE = /^[A-Z0-9_-]{3,30}$/;

async function audit(actor, action, target, detail) {
  await admin.from("admin_audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    target,
    detail: detail || null,
  });
}

const toRow = (pc) => ({
  id: pc.id,
  code: pc.code,
  active: pc.active,
  timesRedeemed: pc.times_redeemed || 0,
  maxRedemptions: pc.max_redemptions || null,
  expiresAt: pc.expires_at ? new Date(pc.expires_at * 1000).toISOString() : null,
  percentOff: pc.coupon?.percent_off || null,
  amountOff: pc.coupon?.amount_off || null,
  currency: pc.coupon?.currency || null,
  duration: pc.coupon?.duration || "once",
  durationInMonths: pc.coupon?.duration_in_months || null,
  createdAt: new Date(pc.created * 1000).toISOString(),
});

async function handleCreate(req, res, actor) {
  const { percentOff, amountOff, duration = "once", durationInMonths, maxRedemptions, expiresAt } = req.body;
  const code = String(req.body.code || "").trim().toUpperCase();

  if (!CODE_RE.test(code)) throw new HttpError(400, "Code invalide : 3 à 30 caractères (A-Z, 0-9, tirets).");
  const pct = Number(percentOff) || 0;
  const amt = Number(amountOff) || 0;
  if ((pct <= 0) === (amt <= 0)) throw new HttpError(400, "Indiquez un pourcentage OU un montant de rabais.");
  if (pct && (pct < 1 || pct > 100)) throw new HttpError(400, "Le pourcentage doit être entre 1 et 100.");
  if (!["once", "repeating", "forever"].includes(duration)) throw new HttpError(400, "Durée inconnue.");
  const months = Number(durationInMonths) || 0;
  if (duration === "repeating" && (months < 1 || months > 36)) throw new HttpError(400, "Durée en mois requise (1 à 36).");

  const coupon = await stripe.coupons.create({
    name: code,
    duration,
    ...(duration === "repeating" ? { duration_in_months: months } : {}),
    ...(pct ? { percent_off: pct } : { amount_off: Math.round(amt * 100), currency: "cad" }),
  });

  let promo;
  try {
    promo = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      ...(Number(maxRedemptions) > 0 ? { max_redemptions: Number(maxRedemptions) } : {}),
      ...(expiresAt ? { expires_at: Math.floor(new Date(expiresAt).getTime() / 1000) } : {}),
    });
  } catch (err) {
    // Don't leave an orphaned coupon behind (e.g. duplicate code name).
    await stripe.coupons.del(coupon.id).catch(() => {});
    throw new HttpError(400, err.message || "Création du code refusée par Stripe.");
  }

  await audit(actor, "create-promo", code, {
    percent_off: pct || null,
    amount_off: amt ? Math.round(amt * 100) : null,
    duration,
    duration_in_months: duration === "repeating" ? months : null,
    max_redemptions: Number(maxRedemptions) || null,
    expires_at: expiresAt || null,
  });
  res.status(200).json({ code: toRow(promo) });
}

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);

    if (req.method === "GET") {
      const { data } = await stripe.promotionCodes.list({ limit: 100 });
      return res.status(200).json({ codes: data.map(toRow) });
    }

    if (req.method === "POST") {
      const { action } = req.body || {};
      if (action === "create") return await handleCreate(req, res, actor);
      if (action === "toggle") {
        const { id, active } = req.body;
        if (!id) throw new HttpError(400, "id requis.");
        const promo = await stripe.promotionCodes.update(id, { active: !!active });
        await audit(actor, "toggle-promo", promo.code, { active: !!active });
        return res.status(200).json({ code: toRow(promo) });
      }
      throw new HttpError(400, "Action inconnue.");
    }

    throw new HttpError(405, "Method not allowed");
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Promo request failed." });
  }
}
