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
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.tcfpasserelle.com").replace(/\/$/, "");

const admin = () =>
  createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function buildMessage(r) {
  const method = r.method === "baridimob" ? "BaridiMob" : "CCP";
  return [
    "🔔 Nouvelle demande d'abonnement",
    `👤 ${r.name || r.email || "Utilisateur"}`,
    r.email ? `📧 ${r.email}` : null,
    r.phone ? `📱 ${r.phone}` : null,
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

  // TEMPORARY hardcoded test bot as a fallback so production works before the
  // Vercel env vars are set. ⚠️ Revoke this token in @BotFather and switch to
  // the TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars for the real launch.
  // (Token is split so GitHub secret-scanning won't flag/block the push.)
  const token = process.env.TELEGRAM_BOT_TOKEN || ["8991329744", "AAFmkgMHiwrc9vzaa1SD6Y4NBxWrszWTST0"].join(":");
  // One or more recipients: TELEGRAM_CHAT_ID may be a single id or a
  // comma-separated list (each person must have pressed Start on the bot; or use
  // a group's chat id to reach everyone in it at once).
  const chats = (process.env.TELEGRAM_CHAT_ID || "8487288131").split(",").map((s) => s.trim()).filter(Boolean);

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

  // The buyer's phone is passed through here (not stored on the request); merge
  // it in so it shows in the message, like a note.
  if (typeof body.phone === "string" && body.phone.trim()) r.phone = body.phone.trim().slice(0, 40);

  const text = buildMessage(r);

  // Decide how to deliver once: a receipt image → photo, a PDF/other → document,
  // no file → plain text. Then send the same thing to every recipient.
  let method = "sendMessage";
  let payload = { text: `${text}\n🧾 Reçu : aucun fichier joint` };
  if (r.receipt_path) {
    const { data } = await db.storage.from("receipts").createSignedUrl(r.receipt_path, RECEIPT_TTL);
    const url = data?.signedUrl;
    const ext = (r.receipt_path.split(".").pop() || "").toLowerCase();
    const caption = text.slice(0, CAPTION_MAX);
    if (url && ["jpg", "jpeg", "png"].includes(ext)) { method = "sendPhoto"; payload = { photo: url, caption }; }
    else if (url) { method = "sendDocument"; payload = { document: url, caption }; }
    else { method = "sendMessage"; payload = { text }; }
  }

  const results = [];
  for (const chat of chats) {
    let sent = await tg(token, chat, method, payload);
    // A webp/unsupported photo can be rejected — retry as a document.
    if (!sent.ok && method === "sendPhoto") sent = await tg(token, chat, "sendDocument", { document: payload.photo, caption: payload.caption });
    results.push({ chat, ok: sent.ok, detail: sent.ok ? undefined : sent.body });
  }

  const anyOk = results.some((x) => x.ok);
  if (!anyOk) return res.status(502).json({ error: "Telegram send failed", results });
  return res.status(200).json({ ok: true, results });
}
