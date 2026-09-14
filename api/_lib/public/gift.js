import { createClient } from "@supabase/supabase-js";
import { requireUser } from "../auth.js";
import { HttpError } from "../groq.js";
import { enforceRateLimit } from "../ratelimit.js";
import { PASSES, isPassSlug, passExpiryISO } from "../passes.js";

// Public side of "gift links" — see api/_lib/admin/giftLinks.js for how an
// admin creates one, and the migration (20260914_gift_links.sql) for the
// data model. Two things happen here:
//
//   GET  /api/public/gift?code=XXXX  — unauthenticated. Tells the landing
//        page what a code is worth before anyone has an account, the same
//        way promo-validate.js previews a Stripe discount.
//   POST /api/public/gift { code }   — requires a signed-in user (this file
//        is grouped with the small public routes purely for the Vercel
//        function count — see api/public/[resource].js — the handler still
//        enforces its own auth). Grants the plan directly on the account,
//        no Stripe checkout involved: see the migration header for why.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CODE_RE = /^[A-Z0-9_-]{3,30}$/;

function normalizeCode(raw) {
  const code = String(raw || "").trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

async function loadLink(code) {
  const { data } = await admin.from("gift_links").select("*").eq("code", code).maybeSingle();
  return data || null;
}

// Collapses every reason a link can't be used into one status — an
// unauthenticated caller (handleValidate) never learns WHICH one, same
// posture as promo-validate.
function statusOf(link) {
  if (!link || !link.active || !isPassSlug(link.plan_slug)) return "invalid";
  if (link.expires_at && Date.parse(link.expires_at) < Date.now()) return "expired";
  if (link.times_redeemed >= link.max_redemptions) return "exhausted";
  return "ok";
}

async function handleValidate(req, res) {
  try {
    await enforceRateLimit(req, { name: "gift-validate", limit: 20, windowSeconds: 60 });
  } catch (err) {
    return res.status(err.status || 429).json({ valid: false, error: err.message });
  }
  res.setHeader("Cache-Control", "no-store");
  const code = normalizeCode(req.query.code);
  if (!code) return res.status(200).json({ valid: false });

  const link = await loadLink(code);
  if (statusOf(link) !== "ok") return res.status(200).json({ valid: false });
  const pass = PASSES[link.plan_slug];
  return res.status(200).json({ valid: true, planSlug: link.plan_slug, planLabel: pass.label, days: pass.days });
}

async function handleRedeem(req, res) {
  const user = await requireUser(req);
  await enforceRateLimit(req, { name: "gift-redeem", limit: 10, windowSeconds: 60, userId: user.id });

  const code = normalizeCode(req.body?.code);
  if (!code) throw new HttpError(400, "Code invalide.");

  // One gift, ever, per account — checked first so a redemption slot is
  // never burned on a request that was always going to be refused.
  const { data: already } = await admin.from("gift_link_redemptions").select("id").eq("user_id", user.id).maybeSingle();
  if (already) throw new HttpError(409, "Vous avez déjà utilisé un lien cadeau sur ce compte.");

  const link = await loadLink(code);
  const status = statusOf(link);
  if (status === "exhausted") throw new HttpError(410, "Ce lien a atteint sa limite d'utilisation.");
  if (status !== "ok") throw new HttpError(404, "Ce lien cadeau n'existe pas ou n'est plus actif.");

  // Optimistic-lock claim: the UPDATE only matches — and only then counts as
  // a won slot — if times_redeemed is still exactly what was just read AND
  // still under the cap. Two people redeeming the last open slot at the same
  // moment can't both win it: the loser's UPDATE matches zero rows and is
  // refused below, instead of a naive read-then-write letting the cap run over.
  const { data: claimed, error: claimErr } = await admin
    .from("gift_links")
    .update({ times_redeemed: link.times_redeemed + 1 })
    .eq("id", link.id)
    .eq("times_redeemed", link.times_redeemed)
    .select()
    .maybeSingle();
  if (claimErr) throw new HttpError(500, claimErr.message || "Échec de la réservation.");
  if (!claimed) throw new HttpError(410, "Ce lien vient d'atteindre sa limite d'utilisation.");

  const pass = PASSES[link.plan_slug];
  const { data: userRow, error: getErr } = await admin.auth.admin.getUserById(user.id);
  if (getErr || !userRow?.user) throw new HttpError(500, "Compte introuvable.");
  const currentMeta = userRow.user.app_metadata || {};

  // Same idempotent "never shorten access" rule as a Stripe purchase
  // (passPatchForSession in api/_lib/passes.js): someone who already holds
  // more time than this gift grants keeps what they have.
  const fresh = passExpiryISO(link.plan_slug);
  const existing = currentMeta.premium_until ? Date.parse(currentMeta.premium_until) : NaN;
  const until = Number.isFinite(existing) && existing > Date.parse(fresh) ? currentMeta.premium_until : fresh;

  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...currentMeta, plan: "Premium", plan_label: pass.label, premium_until: until },
  });
  if (updateErr) {
    // Give the claimed slot back — a failed grant must not burn the cap.
    await admin.from("gift_links").update({ times_redeemed: link.times_redeemed }).eq("id", link.id);
    throw new HttpError(502, "La mise à jour du compte a échoué, réessayez.");
  }

  const { error: redemptionErr } = await admin.from("gift_link_redemptions").insert({ gift_link_id: link.id, user_id: user.id });
  if (redemptionErr?.code === "23505") {
    // Same account redeemed twice in a very close race: the grant above
    // already landed (idempotently) either way, so this is still a success
    // for the account — only the extra slot needs to be given back.
    await admin.from("gift_links").update({ times_redeemed: link.times_redeemed }).eq("id", link.id);
  } else if (redemptionErr) {
    console.warn("gift-redeem: redemption row insert failed:", redemptionErr.message);
  }

  await admin.from("admin_audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "redeem-gift-link",
    target: code,
    detail: { plan_slug: link.plan_slug, premium_until: until },
  });

  return res.status(200).json({ ok: true, planLabel: pass.label, premiumUntil: until });
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return await handleValidate(req, res);
    if (req.method === "POST") return await handleRedeem(req, res);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Gift link request failed." });
  }
}
