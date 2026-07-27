import { createClient } from "@supabase/supabase-js";

// Notifies the owner on WhatsApp when a new DZD subscription request lands.
// Triggered by a Supabase Database Webhook on INSERT into subscription_requests
// (see the setup guide). The request itself still goes to the admin "Demandes"
// inbox for approval — this only pings you so you don't have to keep checking.
//
// Delivery is via CallMeBot's free WhatsApp API, which is TEXT ONLY: the receipt
// is included as a tap-to-view signed link (valid 7 days), alongside the payment
// details. The message text transits CallMeBot's relay, so treat it as you would
// any third-party notifier.
//
// Required env (Vercel project):
//   SUBSCRIPTION_WEBHOOK_SECRET  shared secret; must match the webhook header
//   OWNER_WHATSAPP_PHONE         your number in intl format, e.g. 213xxxxxxxxx
//   CALLMEBOT_APIKEY             the key CallMeBot gives you
//   VITE_SUPABASE_URL            (already set) — to sign the receipt URL
//   SUPABASE_SERVICE_ROLE_KEY    (already set) — server-only
//   SITE_URL                     (optional) — for the admin deep link

const RECEIPT_TTL = 7 * 24 * 60 * 60; // 7 days
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://tcfpasserelle.com").replace(/\/$/, "");

const admin = () =>
  createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function buildMessage(r, receiptUrl) {
  const method = r.method === "baridimob" ? "BaridiMob" : "CCP";
  const lines = [
    "🔔 Nouvelle demande d'abonnement",
    `👤 ${r.name || r.email || "Utilisateur"}`,
    r.email ? `📧 ${r.email}` : null,
    `📦 ${r.plan}${r.plan_days ? ` (${r.plan_days} j)` : ""}`,
    `💳 ${method}${r.amount_dzd ? ` · ${r.amount_dzd} DZD` : ""}`,
    r.reference ? `🔖 Réf : ${r.reference}` : null,
    r.notes ? `📝 ${r.notes}` : null,
    receiptUrl ? `🧾 Reçu : ${receiptUrl}` : "🧾 Reçu : (aucun fichier joint)",
    `👉 À valider : ${SITE}/administration (onglet Demandes)`,
  ];
  return lines.filter(Boolean).join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Only Supabase's webhook (which carries the shared secret) may call this.
  const secret = process.env.SUBSCRIPTION_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: "Not configured (SUBSCRIPTION_WEBHOOK_SECRET)" });
  const provided = req.headers.authorization === `Bearer ${secret}` || req.headers["x-webhook-secret"] === secret;
  if (!provided) return res.status(401).json({ error: "Unauthorized" });

  // Supabase DB webhook body: { type, table, record, old_record, ... }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const r = body.record;
  if (body.type !== "INSERT" || !r) return res.status(200).json({ skipped: "not an insert" });

  const phone = process.env.OWNER_WHATSAPP_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return res.status(200).json({ skipped: "whatsapp not configured" });

  // Long-lived signed URL for the receipt so the link still works when you open
  // WhatsApp later. No-op when the user submitted without a file.
  let receiptUrl = null;
  if (r.receipt_path) {
    const { data } = await admin().storage.from("receipts").createSignedUrl(r.receipt_path, RECEIPT_TTL);
    receiptUrl = data?.signedUrl || null;
  }

  const text = buildMessage(r, receiptUrl);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;

  try {
    const wa = await fetch(url);
    const out = await wa.text();
    if (!wa.ok) return res.status(502).json({ error: "CallMeBot send failed", status: wa.status, out: out.slice(0, 300) });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
