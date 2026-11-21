import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { audit } from "./users.js";
import { createStripePromo } from "./promo.js";
import { sendMail, mailConfigured, TEAM_ADDRESS } from "../mailer.js";
import { acceptedEmail, declinedEmail, salesSummary } from "../partners.js";

// Partner programme, admin side (Administration → Partenaires):
//   GET  /api/admin/partners                                   → { partners: [...] } with sales totals
//   POST { action: "activate", applicationId, discountPct?, commissionPct?, seats?, accessUntil?, message, sendEmail }
//   POST { action: "decline", applicationId, message, sendEmail }
//   POST { action: "payout", partnerId, amount, currency, method?, note? }
//   POST { action: "update", partnerId, commissionPct?, seats?, accessUntil?, status? }
//
// Activating is what turns an application into a partner: for a teacher or a
// creator, their chosen code becomes a live Stripe promotion code at the agreed
// discount (unless it already is one); the partner row is created; the
// application is marked accepted; and, if asked, the welcome email goes out
// with the code and the link to their space.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CODE_KINDS = ["teacher", "creator"];
const SCHOOL_KINDS = ["school"];
const PAYOUT_METHODS = ["wise", "bank", "baridimob", "cash", "other"];
const pctOrNull = (v, { min = 0 } = {}) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > 100) throw new HttpError(400, "Pourcentage invalide (0 à 100).");
  return Math.round(n * 100) / 100;
};
const intOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 100000) throw new HttpError(400, "Nombre de places invalide.");
  return n;
};
const dateOrNull = (v) => {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new HttpError(400, "Date de fin invalide.");
  return String(v);
};

async function sendTo(to, { subject, html }) {
  if (!mailConfigured()) return false;
  try {
    await sendMail({ to, replyTo: TEAM_ADDRESS, subject, html });
    return true;
  } catch (err) {
    console.warn("partners: email:", err.message);
    return false;
  }
}

async function list(res) {
  const [{ data: partners, error }, { data: sales }, { data: payouts }] = await Promise.all([
    admin.from("partners").select("*").order("created_at", { ascending: false }),
    admin.from("partner_sales").select("partner_id, occurred_at, amount, currency, commission"),
    admin.from("partner_payouts").select("partner_id, paid_at, amount, currency, method, note").order("paid_at", { ascending: false }),
  ]);
  if (error) throw new HttpError(503, error.code === "42P01" || /schema cache/.test(error.message) ? "missing-table" : error.message);
  const rows = (partners || []).map((p) => {
    const mine = (sales || []).filter((s) => s.partner_id === p.id);
    const paid = (payouts || []).filter((x) => x.partner_id === p.id);
    return { ...p, linked: !!p.user_id, user_id: undefined, summary: salesSummary(mine, paid), payouts: paid };
  });
  return res.status(200).json({ partners: rows });
}

async function activate(req, res, actor) {
  const b = req.body || {};
  const { data: app } = await admin.from("partner_applications").select("*").eq("id", String(b.applicationId || "")).maybeSingle();
  if (!app) throw new HttpError(404, "Demande introuvable.");
  const { data: existing } = await admin.from("partners").select("id").eq("application_id", app.id).maybeSingle();
  if (existing) throw new HttpError(409, "Cette demande a déjà un espace partenaire.");

  const withCode = CODE_KINDS.includes(app.kind) && !!app.desired_code;
  const discountPct = withCode ? pctOrNull(b.discountPct, { min: 1 }) : null;
  const commissionPct = withCode ? pctOrNull(b.commissionPct) : null;
  if (withCode && !discountPct) throw new HttpError(400, "Indiquez la remise du code (en %).");
  const seats = SCHOOL_KINDS.includes(app.kind) ? intOrNull(b.seats) : null;
  const accessUntil = SCHOOL_KINDS.includes(app.kind) ? dateOrNull(b.accessUntil) : null;

  // The Stripe code first: if Stripe refuses it, nothing else has changed.
  if (withCode && !app.code_created_at) {
    await createStripePromo({ code: app.desired_code, pct: discountPct });
    await audit(actor, "create-promo", app.desired_code, { percent_off: discountPct, partner: app.id });
  }

  const { data: partner, error } = await admin.from("partners").insert({
    application_id: app.id,
    kind: app.kind,
    name: app.organisation || app.name,
    email: String(app.email).trim().toLowerCase(),
    code: withCode ? app.desired_code : null,
    discount_pct: discountPct,
    commission_pct: commissionPct,
    seats,
    access_until: accessUntil,
    created_by: actor.id,
  }).select().single();
  if (error) throw new HttpError(502, `Espace non créé : ${error.message}`);

  await admin.from("partner_applications").update({
    status: "accepted",
    ...(withCode && !app.code_created_at ? { code_created_at: new Date().toISOString() } : {}),
  }).eq("id", app.id);
  await audit(actor, "partner-activate", partner.email, { partner: partner.id, kind: partner.kind, code: partner.code, discount_pct: discountPct, commission_pct: commissionPct, seats, access_until: accessUntil });

  const message = String(b.message || "").trim().slice(0, 4000);
  const emailed = b.sendEmail ? await sendTo(partner.email, acceptedEmail({ app, partner, message })) : false;
  return res.status(200).json({ ok: true, partner, emailed });
}

async function decline(req, res, actor) {
  const b = req.body || {};
  const { data: app } = await admin.from("partner_applications").select("*").eq("id", String(b.applicationId || "")).maybeSingle();
  if (!app) throw new HttpError(404, "Demande introuvable.");
  await admin.from("partner_applications").update({ status: "declined" }).eq("id", app.id);
  await audit(actor, "partner-decline", app.email, { application: app.id });
  const message = String(b.message || "").trim().slice(0, 4000);
  const emailed = b.sendEmail && message ? await sendTo(app.email, declinedEmail({ app, message })) : false;
  return res.status(200).json({ ok: true, emailed });
}

async function payout(req, res, actor) {
  const b = req.body || {};
  const amount = Number(b.amount);
  if (!(amount > 0)) throw new HttpError(400, "Montant invalide.");
  const currency = String(b.currency || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, "Devise invalide.");
  const row = {
    partner_id: String(b.partnerId || ""),
    amount: Math.round(amount * 100) / 100,
    currency,
    method: PAYOUT_METHODS.includes(b.method) ? b.method : null,
    note: b.note ? String(b.note).trim().slice(0, 500) : null,
    created_by: actor.id,
  };
  const { error } = await admin.from("partner_payouts").insert(row);
  if (error) throw new HttpError(502, error.message);
  await audit(actor, "partner-payout", row.partner_id, { amount: row.amount, currency, method: row.method });
  return res.status(200).json({ ok: true });
}

async function update(req, res, actor) {
  const b = req.body || {};
  const patch = {};
  if ("commissionPct" in b) patch.commission_pct = pctOrNull(b.commissionPct);
  if ("seats" in b) patch.seats = intOrNull(b.seats);
  if ("accessUntil" in b) patch.access_until = dateOrNull(b.accessUntil);
  if ("status" in b) {
    if (!["active", "paused"].includes(b.status)) throw new HttpError(400, "Statut inconnu.");
    patch.status = b.status;
  }
  if (!Object.keys(patch).length) throw new HttpError(400, "Rien à modifier.");
  const { error } = await admin.from("partners").update(patch).eq("id", String(b.partnerId || ""));
  if (error) throw new HttpError(502, error.message);
  await audit(actor, "partner-update", String(b.partnerId), patch);
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);
    if (req.method === "GET") return await list(res);
    if (req.method === "POST") {
      const { action } = req.body || {};
      if (action === "activate") return await activate(req, res, actor);
      if (action === "decline") return await decline(req, res, actor);
      if (action === "payout") return await payout(req, res, actor);
      if (action === "update") return await update(req, res, actor);
      throw new HttpError(400, "Action inconnue.");
    }
    throw new HttpError(405, "Method not allowed");
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "Erreur serveur." });
  }
}
