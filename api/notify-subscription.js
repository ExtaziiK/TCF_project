import { createClient } from "@supabase/supabase-js";

// Notifies the owner on Telegram when a new DZD subscription request lands.
// Called by the app right after a request is saved (POST { id }); the row is
// read back with the service role, so the client only ever passes an id. The
// request still goes to the admin "Demandes" inbox for approval — this only
// pings you so you don't have to keep checking.
//
// Telegram delivers the actual receipt: images as a photo, PDFs/others as a
// document (Telegram fetches a short-lived signed URL), with the payment
// details as the caption.
//
// Required env (Vercel project):
//   TELEGRAM_BOT_TOKEN   from @BotFather
//   TELEGRAM_CHAT_ID     your chat id
//   VITE_SUPABASE_URL    (already set) — read the row + sign the receipt
//   SUPABASE_SERVICE_ROLE_KEY (already set) — server-only
//   SITE_URL             (optional) — admin deep link
//   SUBSCRIPTION_WEBHOOK_SECRET (optional) — only for the Supabase-webhook path

const RECEIPT_TTL = 60 * 60;          // 1 h — Telegram downloads at send time
const RECENT_MS = 20 * 60 * 1000;     // only notify for requests < 20 min old
const CAPTION_MAX = 1000;             // Telegram caption limit is 1024
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

async function tg(token, chat, method, payload) {
  const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, ...payload }),
  });
  return { ok: resp.ok, body: await resp.json().catch(() => ({})) };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return res.status(200).json({ skipped: "telegram not configured" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const db = admin();

  // Resolve the request row. Two supported triggers:
  //   1. App call:        { id }            → read the row by id (default)
  //   2. Supabase webhook: { type, record } → use the record, if the secret matches
  let r = null;
  if (body.id) {
    const { data } = await db.from("subscription_requests").select("*").eq("id", body.id).single();
    r = data;
  } else if (body.type === "INSERT" && body.record) {
    const secret = process.env.SUBSCRIPTION_WEBHOOK_SECRET;
    const okSecret = secret && (req.headers.authorization === `Bearer ${secret}` || req.headers["x-webhook-secret"] === secret);
    if (!okSecret) return res.status(401).json({ error: "Unauthorized" });
    r = body.record;
  }
  if (!r) return res.status(200).json({ skipped: "no request" });

  // Guard against replay: only notify for a recently-created request.
  if (r.created_at && Date.now() - new Date(r.created_at).getTime() > RECENT_MS) {
    return res.status(200).json({ skipped: "stale" });
  }

  const text = buildMessage(r);

  // Sign the receipt so Telegram can fetch it; send as photo (images) or
  // document (PDF / webp / other). No file → plain text.
  let sent;
  if (r.receipt_path) {
    const { data } = await db.storage.from("receipts").createSignedUrl(r.receipt_path, RECEIPT_TTL);
    const url = data?.signedUrl;
    const ext = (r.receipt_path.split(".").pop() || "").toLowerCase();
    const isPhoto = ["jpg", "jpeg", "png"].includes(ext);
    if (url && isPhoto) {
      sent = await tg(token, chat, "sendPhoto", { photo: url, caption: text.slice(0, CAPTION_MAX) });
      if (!sent.ok) sent = await tg(token, chat, "sendDocument", { document: url, caption: text.slice(0, CAPTION_MAX) });
    } else if (url) {
      sent = await tg(token, chat, "sendDocument", { document: url, caption: text.slice(0, CAPTION_MAX) });
    } else {
      sent = await tg(token, chat, "sendMessage", { text });
    }
  } else {
    sent = await tg(token, chat, "sendMessage", { text: `${text}\n🧾 Reçu : aucun fichier joint` });
  }

  if (!sent?.ok) return res.status(502).json({ error: "Telegram send failed", detail: sent?.body });
  return res.status(200).json({ ok: true });
}
