import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { sendMail, mailConfigured, supportReplyEmail } from "../mailer.js";

// Answering a contact message.
//
//   GET  /api/admin/reply                                  → { mailConfigured }
//   POST /api/admin/reply { messageId, body, alsoEmail }   → { ok, delivered }
//
// Two delivery channels, and which ones apply is decided by the message, not by
// the admin: a member who wrote while signed in gets the answer inside their
// account (contact_replies, read on the profile page and announced by the nav
// bell), and email is optional on top. A visitor with no account has no inbox
// to deliver to, so email is the only channel and the reply is refused rather
// than stored if the send fails — a reply nobody received is worse than an
// error, because the dashboard would show the thread as answered.
//
// Replies are written here with the service role: contact_replies has no insert
// policy at all (see 20260813_contact_replies.sql), so a message claiming to be
// from the team cannot be fabricated from a browser.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.tcfpasserelle.com").replace(/\/$/, "");

// Same ceiling as contact_messages.message and the table's own CHECK.
const MAX_BODY = 4000;

async function handlePost(req, res, actor) {
  const { messageId, body, alsoEmail } = req.body || {};
  const text = String(body || "").trim();
  if (!messageId) throw new HttpError(400, "Message introuvable.");
  if (!text) throw new HttpError(400, "La réponse est vide.");
  if (text.length > MAX_BODY) throw new HttpError(400, `La réponse dépasse ${MAX_BODY} caractères.`);

  const { data: message, error } = await admin
    .from("contact_messages")
    .select("id, user_id, name, email, subject, message")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw new HttpError(502, `Lecture du message impossible : ${error.message}`);
  if (!message) throw new HttpError(404, "Ce message n'existe plus.");

  const inApp = !!message.user_id;
  // Email is forced for a visitor (no account = no in-app inbox) and optional
  // for a member, who will see the reply on their profile either way.
  const wantsEmail = !inApp || alsoEmail !== false;

  let emailed = false;
  let emailError = null;
  if (wantsEmail) {
    if (!mailConfigured()) {
      emailError = "L'envoi d'emails n'est pas configuré (SMTP_USER / SMTP_PASS).";
    } else {
      try {
        const { subject, html } = supportReplyEmail({
          name: message.name,
          subject: message.subject,
          body: text,
          original: message.message,
          site: inApp ? SITE : null, // no account → the "voir sur mon compte" button would lead nowhere
        });
        await sendMail({ to: message.email, subject, html });
        emailed = true;
      } catch (err) {
        emailError = err.message || "Envoi refusé par le serveur d'email.";
      }
    }
  }

  // Nothing reached the person: say so and store nothing, so the inbox never
  // shows an answered thread that was never delivered.
  if (!inApp && !emailed) throw new HttpError(502, `Réponse non envoyée : ${emailError}`);

  const { data: reply, error: insertError } = await admin
    .from("contact_replies")
    .insert({
      message_id: message.id,
      body: text,
      sent_by: actor.id,
      sent_by_email: actor.email || null,
      emailed,
    })
    .select("id, created_at")
    .single();
  if (insertError) {
    // The email may already be gone, so this is reported as a partial success
    // rather than swallowed: the admin needs to know not to send it twice.
    throw new HttpError(
      502,
      `${emailed ? "L'email est parti, mais la" : "La"} réponse n'a pas pu être enregistrée : ${insertError.message}` +
      (/contact_replies/.test(insertError.message) ? " — la migration 20260813_contact_replies.sql est-elle appliquée ?" : ""),
    );
  }

  // Answering closes the message. The admin can always reopen it from the tab.
  await admin.from("contact_messages").update({ status: "resolved" }).eq("id", message.id);
  await admin.from("admin_audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action: "reply-message",
    target: message.email,
    // The reply's text is not copied here: the audit log records that an answer
    // was sent and through which channel, and the answer itself lives in
    // contact_replies where the member can read it too.
    detail: { messageId: message.id, replyId: reply.id, inApp, emailed, chars: text.length },
  });

  res.status(200).json({
    ok: true,
    reply: { id: reply.id, createdAt: reply.created_at, emailed },
    delivered: { inApp, email: emailed },
    emailError,
  });
}

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);
    // Lets the compose box offer the email checkbox only when it would work.
    if (req.method === "GET") return res.status(200).json({ mailConfigured: mailConfigured() });
    if (req.method === "POST") return await handlePost(req, res, actor);
    throw new HttpError(405, "Method not allowed");
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Reply request failed." });
  }
}
