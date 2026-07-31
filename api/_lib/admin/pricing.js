import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { PASSES, PASS_SLUGS, resolvePassPrice } from "../passes.js";

// Pass pricing, read and changed from the admin Tarifs tab.
//
//   GET  /api/admin/pricing              → { passes: [{ slug, label, days, amount, … }] }
//   POST /api/admin/pricing { slug, amount }  → { ok: true, amount }
//
// A Stripe Price is immutable in its amount, so "changing a price" always means
// creating a new one. What makes that safe to do from here is the lookup key:
// the new price is created with `transfer_lookup_key: true`, which moves the
// key off the old price onto the new one, so every lookup — checkout, the
// pricing page, this panel — follows automatically with no deploy and no ids to
// keep in sync. The old price is then archived so it can never be sold again.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Fat-finger guards, in cents. The floor is Stripe's own minimum charge for
// USD; the ceiling is far above any plausible pass and exists only so a
// mistyped amount fails loudly instead of going live.
const MIN_AMOUNT = 50;
const MAX_AMOUNT = 100000;

async function audit(actor, action, target, detail) {
  await admin.from("admin_audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    target,
    detail: detail || null,
  });
}

async function handleGet(res) {
  const passes = await Promise.all(
    PASS_SLUGS.map(async (slug) => {
      const pass = PASSES[slug];
      const price = await resolvePassPrice(stripe, slug).catch(() => null);
      return {
        slug,
        label: pass.label,
        days: pass.days,
        lookupKey: pass.lookupKey,
        amount: price?.unit_amount ?? null,
        currency: price?.currency ?? null,
        priceId: price?.id ?? null,
        // Surfaced so a pass that cannot be resolved is visibly broken in the
        // panel rather than silently showing a blank price.
        resolved: !!price,
      };
    }),
  );
  return res.status(200).json({ passes });
}

async function handlePost(req, res, actor) {
  const { slug, amount } = req.body || {};
  if (!PASS_SLUGS.includes(slug)) throw new HttpError(400, "Forfait inconnu.");

  const cents = Number(amount);
  if (!Number.isInteger(cents) || cents < MIN_AMOUNT || cents > MAX_AMOUNT) {
    throw new HttpError(400, `Montant invalide (entre ${(MIN_AMOUNT / 100).toFixed(2)} et ${(MAX_AMOUNT / 100).toFixed(0)}).`);
  }

  const current = await resolvePassPrice(stripe, slug);
  if (!current) throw new HttpError(502, "Prix actuel introuvable dans Stripe.");
  if (current.unit_amount === cents) return res.status(200).json({ ok: true, amount: cents, unchanged: true });

  const pass = PASSES[slug];
  const productId = typeof current.product === "string" ? current.product : current.product?.id;
  if (!productId) throw new HttpError(502, "Produit Stripe introuvable pour ce forfait.");

  let created;
  try {
    // Same product, same currency, same one-time shape — only the amount moves.
    // transfer_lookup_key is what makes this a re-pricing rather than a second
    // competing price: the key leaves the old price at this moment.
    created = await stripe.prices.create({
      product: productId,
      unit_amount: cents,
      currency: current.currency,
      lookup_key: pass.lookupKey,
      transfer_lookup_key: true,
    });
  } catch (err) {
    throw new HttpError(502, `Stripe a refusé le nouveau prix : ${err.message}`);
  }

  // Archive the old one so it cannot be checked out by a stale link or an
  // in-flight session. Best effort: the lookup key has already moved, so the
  // new price is live regardless — a failure here leaves an orphan, not a bug.
  try {
    await stripe.prices.update(current.id, { active: false });
  } catch (err) {
    console.warn(`pricing: could not archive ${current.id}: ${err.message}`);
  }

  await audit(actor, "set-price", pass.label, {
    slug,
    from: current.unit_amount,
    to: cents,
    currency: current.currency,
    old_price: current.id,
    new_price: created.id,
  });

  return res.status(200).json({ ok: true, amount: cents, priceId: created.id });
}

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);
    if (req.method === "GET") return await handleGet(res);
    if (req.method === "POST") return await handlePost(req, res, actor);
    throw new HttpError(405, "Method not allowed");
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Admin request failed." });
  }
}
