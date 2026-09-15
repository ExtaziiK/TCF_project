import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { PASSES, isPassSlug } from "../passes.js";

// Admin management of "gift links" — shareable URLs that grant a chosen plan
// for free to whoever redeems them, capped at N accounts. See the migration
// (20260914_gift_links.sql) for the data model and api/_lib/public/gift.js
// for validation + redemption, the part a visitor actually hits.
//
//   GET  /api/admin/gift-links                → { links: [...] }
//   POST /api/admin/gift-links { action: "create", planSlug, maxRedemptions,
//                                 code?, note?, expiresAt? }
//   POST /api/admin/gift-links { action: "toggle", id, active }
//   POST /api/admin/gift-links { action: "delete", id }

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CODE_RE = /^[A-Z0-9_-]{3,30}$/;
// Excludes 0/O and 1/I/L — an auto-generated code is meant to be read off a
// screen or typed by hand, not just clicked.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const randomCode = () =>
  Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");

async function audit(actor, action, target, detail) {
  await admin.from("admin_audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    target,
    detail: detail || null,
  });
}

const toRow = (row) => ({
  id: row.id,
  code: row.code,
  planSlug: row.plan_slug,
  planLabel: PASSES[row.plan_slug]?.label || row.plan_slug,
  maxRedemptions: row.max_redemptions,
  timesRedeemed: row.times_redeemed,
  active: row.active,
  note: row.note,
  // `days` is the admin's override, null when the link just uses the plan's
  // own duration; `effectiveDays` is what redemption actually grants either
  // way, so the panel never has to re-derive it from PASSES itself.
  days: row.days,
  effectiveDays: row.days || PASSES[row.plan_slug]?.days || null,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
});

async function handleCreate(req, res, actor) {
  const { planSlug, note, expiresAt } = req.body;
  if (!isPassSlug(planSlug)) throw new HttpError(400, "Forfait inconnu.");
  const maxRedemptions = Number(req.body.maxRedemptions);
  if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1) {
    throw new HttpError(400, "Indiquez pour combien de comptes ce lien est valable (nombre entier > 0).");
  }
  if (maxRedemptions > 100000) throw new HttpError(400, "Nombre de comptes trop élevé.");

  // Optional: overrides the plan's own duration (Starter 15 / Pro 30 /
  // Ultimate 90). Left empty, redemption grants the plan's default — see
  // api/_lib/public/gift.js.
  let days = null;
  if (req.body.days !== undefined && req.body.days !== null && req.body.days !== "") {
    days = Number(req.body.days);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      throw new HttpError(400, "Durée invalide : indiquez un nombre de jours entre 1 et 3650, ou laissez vide pour la durée par défaut du forfait.");
    }
  }

  const code = String(req.body.code || "").trim().toUpperCase();
  if (code && !CODE_RE.test(code)) throw new HttpError(400, "Code invalide : 3 à 30 caractères (A-Z, 0-9, tirets).");

  const row = {
    plan_slug: planSlug,
    max_redemptions: maxRedemptions,
    days,
    note: note ? String(note).trim().slice(0, 200) : null,
    expires_at: expiresAt || null,
    created_by: actor.id,
    created_by_email: actor.email,
  };

  // Auto-generated codes retry on a collision (vanishingly unlikely at 8
  // characters from a 31-symbol alphabet, but cheap to guard); a custom code
  // that collides is reported to the admin instead of silently mutated.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = code || randomCode();
    const { data, error } = await admin.from("gift_links").insert({ ...row, code: candidate }).select().single();
    if (!error) {
      await audit(actor, "create-gift-link", candidate, {
        plan_slug: planSlug,
        max_redemptions: maxRedemptions,
        days,
        expires_at: expiresAt || null,
      });
      return res.status(200).json({ link: toRow(data) });
    }
    if (error.code !== "23505") throw new HttpError(500, error.message || "Création refusée.");
    if (code) throw new HttpError(409, `Le code ${code} existe déjà.`);
    // else: auto-generated code collided — loop and try another
  }
  throw new HttpError(500, "Impossible de générer un code unique, réessayez.");
}

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);

    if (req.method === "GET") {
      const { data, error } = await admin.from("gift_links").select("*").order("created_at", { ascending: false });
      if (error) throw new HttpError(500, error.message);
      return res.status(200).json({ links: (data || []).map(toRow) });
    }

    if (req.method === "POST") {
      const { action } = req.body || {};
      if (action === "create") return await handleCreate(req, res, actor);

      if (action === "toggle") {
        const { id, active } = req.body;
        if (!id) throw new HttpError(400, "id requis.");
        const { data, error } = await admin.from("gift_links").update({ active: !!active }).eq("id", id).select().single();
        if (error || !data) throw new HttpError(404, "Lien introuvable.");
        await audit(actor, "toggle-gift-link", data.code, { active: !!active });
        return res.status(200).json({ link: toRow(data) });
      }

      // Deleting only stops the link from being redeemed again — access
      // already granted through it lives in each account's app_metadata,
      // independent of this row, and is untouched (same posture as deleting
      // a promo code; see api/_lib/admin/promo.js).
      if (action === "delete") {
        const { id } = req.body;
        if (!id) throw new HttpError(400, "id requis.");
        const { data, error } = await admin.from("gift_links").delete().eq("id", id).select().single();
        if (error || !data) throw new HttpError(404, "Lien introuvable.");
        await audit(actor, "delete-gift-link", data.code, { times_redeemed: data.times_redeemed });
        return res.status(200).json({ deleted: true, id });
      }

      throw new HttpError(400, "Action inconnue.");
    }

    throw new HttpError(405, "Method not allowed");
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Gift link request failed." });
  }
}
