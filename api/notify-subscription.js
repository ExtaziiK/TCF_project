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
// Required env (Vercel project) — both mandatory, the handler refuses to run
// without them (see the note above the credentials below):
//   TELEGRAM_BOT_TOKEN   from @BotFather (/token; rotate with /revoke)
//   TELEGRAM_CHAT_ID     your chat id, or several comma-separated
//   VITE_SUPABASE_URL    (already set) — read the row + sign the receipt
//   SUPABASE_SERVICE_ROLE_KEY (already set) — server-only
//   SITE_URL             (optional) — admin deep link
//   SUBSCRIPTION_WEBHOOK_SECRET (optional) — only for the Supabase-webhook path
//
// If the notification silently stops arriving, check these two before the code
// — both fail at Telegram's end and are invisible from here, because the app
// fires this call and ignores the response on purpose (a broken notification
// must never break someone's checkout):
//
//   · A bot cannot open a conversation. Every recipient in TELEGRAM_CHAT_ID
//     must have pressed Start on THIS bot, or the send is refused with
//     "403 bot can't initiate conversation with a user". Replacing the bot
//     resets that: a new bot has no conversation with anyone, even though the
//     chat id is unchanged (for a private chat it is the recipient's own user
//     id, the same across every bot).
//   · Rotating credentials means /revoke on the existing bot, which keeps its
//     username, its chats and its Start history. /newbot makes a SECOND bot and
//     leaves the old token working — replacing a leaked one that way rotates
//     nothing and quietly breaks delivery until someone presses Start.

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

  // Credentials come from the environment, with no fallback on purpose. A
  // hardcoded "temporary" bot token used to sit here so production could run
  // before the Vercel vars existed; it was committed, split across a join so
  // GitHub's secret scanning wouldn't catch it, and it outlived its purpose by
  // a long way. That token is revoked. Do not reintroduce the pattern: an
  // unset variable must break loudly here rather than quietly send through
  // some other bot.
  //
  // TELEGRAM_CHAT_ID takes one id or a comma-separated list (each recipient
  // must have pressed Start on the bot; a group's chat id reaches everyone in
  // it at once).
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = (process.env.TELEGRAM_CHAT_ID || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!token || !chats.length) {
    // 500, not a silent 200: the caller treats this as fire-and-forget, so the
    // deployment log is the only place a missing variable can surface.
    const missing = [!token && "TELEGRAM_BOT_TOKEN", !chats.length && "TELEGRAM_CHAT_ID"].filter(Boolean);
    console.error(`notify-subscription: not configured — set ${missing.join(" and ")} in the Vercel project.`);
    return res.status(500).json({ error: "Telegram not configured", missing });
  }

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
