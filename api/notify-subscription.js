import { createClient } from "@supabase/supabase-js";

// Notifies the owner on Telegram when a new DZD subscription request lands.
// Triggered by a Supabase Database Webhook on INSERT into subscription_requests
// (see the setup guide). The request itself still goes to the admin "Demandes"
// inbox for approval — this only pings you so you don't have to keep checking.
//
// Telegram delivers the actual receipt: images go as a photo, PDFs (and other
// types) as a document, with the payment details as the caption. Telegram
// fetches the file server-side from a short-lived signed URL, so the private
// receipts bucket stays private.
//
// Required env (Vercel project):
//   SUBSCRIPTION_WEBHOOK_SECRET  shared secret; must match the webhook header
//   TELEGRAM_BOT_TOKEN           from @BotFather
//   TELEGRAM_CHAT_ID             your chat id (see guide)
//   VITE_SUPABASE_URL            (already set) — to sign the receipt URL
//   SUPABASE_SERVICE_ROLE_KEY    (already set) — server-only
//   SITE_URL                     (optional) — for the admin deep link

const RECEIPT_TTL = 60 * 60; // 1 h — Telegram downloads the file at send time
const CAPTION_MAX = 1000; // Telegram caption limit is 1024; keep margin
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://tcfpasserelle.com").replace(/\/$/, "");

const admin = () =>
  createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function buildMessage(r) {
  const method = r.method === "baridimob" ? "BaridiMob" : "CCP";
  return [
    "🔔 Nouvelle demande d'abonnement",
    `👤 ${r.name || r.email || "Utilisateur"}`,
    r.email ? `📧 ${r.email}` : null,
    `📦 ${r.plan}${r.plan_days ? ` (${r.plan_days} j)` : ""}`,
    `💳 ${method}${r.amount_dzd ? ` · ${r.amount_dzd} DZD` : ""}`,
    r.reference ? `🔖 Réf : ${r.reference}` : null,
    r.notes ? `📝 ${r.notes}` : null,
    `👉 À valider : ${SITE}/administration (onglet Demandes)`,
  ].filter(Boolean).join("\n");
}

async function tg(method, payload) {
  const resp = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, ...payload }),
  });
  return { ok: resp.ok, body: await resp.json().catch(() => ({})) };
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

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return res.status(200).json({ skipped: "telegram not configured" });
  }

  const text = buildMessage(r);

  // Sign the receipt so Telegram can fetch it, then send it as a photo (images)
  // or a document (PDF / webp / anything else). No file → plain text message.
  let sent;
  if (r.receipt_path) {
    const { data } = await admin().storage.from("receipts").createSignedUrl(r.receipt_path, RECEIPT_TTL);
    const url = data?.signedUrl;
    const ext = (r.receipt_path.split(".").pop() || "").toLowerCase();
    const isPhoto = ["jpg", "jpeg", "png"].includes(ext);
    if (url && isPhoto) {
      sent = await tg("sendPhoto", { photo: url, caption: text.slice(0, CAPTION_MAX) });
      if (!sent.ok) sent = await tg("sendDocument", { document: url, caption: text.slice(0, CAPTION_MAX) });
    } else if (url) {
      sent = await tg("sendDocument", { document: url, caption: text.slice(0, CAPTION_MAX) });
    }
    // If signing failed, still send the details as text below.
    if (!url) sent = await tg("sendMessage", { text });
  } else {
    sent = await tg("sendMessage", { text: `${text}\n🧾 Reçu : aucun fichier joint` });
  }

  if (!sent?.ok) return res.status(502).json({ error: "Telegram send failed", detail: sent?.body });
  return res.status(200).json({ ok: true });
}
