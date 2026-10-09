import { createClient } from "@supabase/supabase-js";
import { requireUser, isPremiumUser } from "../auth.js";
import { enforceRateLimit } from "../ratelimit.js";
import { sendMail, mailConfigured, TEAM_ADDRESS } from "../mailer.js";
import { escapeHtml } from "../emailLayout.js";
import { describeDevice } from "../device.js";
import { normalizeWhatsApp } from "../phone.js";

// POST /api/public/support — "Toujours bloqué·e ? Contactez-nous" from a
// failed analysis or a microphone problem (src/components/expression/
// SupportDialog.jsx).
//
// The request reaches the team twice, on purpose:
//   - as a row in contact_messages, so it sits in Administration → Messages
//     with the usual reply button, like any contact message;
//   - as an email to the team mailbox, with the candidate as Reply-To and a
//     one-tap WhatsApp link — the point of the form is a call back, and an
//     inbox row nobody is notified about is not a call back.
// Either one alone is enough to answer "ok": the email failing (SMTP down)
// still leaves the row, and the candidate is never told something failed that
// the team will see anyway.
//
// The technical context (what the candidate was shown, which tâche, device and
// browser, plan) is attached automatically, so nobody has to ask "what phone
// are you on?" before helping.

export const SUPPORT_SUBJECT = "Problème technique — besoin d'assistance";

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const SECTION_NAMES = { ee: "Expression écrite", eo: "Expression orale" };

// The context block, as lines — shared by the inbox row and the email.
export function contextLines({ ctx = {}, device, plan, phone }) {
  const where = [SECTION_NAMES[ctx.section], ctx.task && `tâche ${ctx.task}`].filter(Boolean).join(" · ");
  return [
    ["WhatsApp", phone.e164 || phone.typed],
    ["Problème affiché", ctx.issue],
    ["Épreuve", where],
    ["Page", ctx.page],
    ["Appareil", [device.device, device.browser].filter((v) => v && v !== "inconnu").join(" · ")],
    ["Compte", plan],
    ["Connexion", ctx.online === false ? "hors ligne au moment de l'envoi" : null],
  ].filter(([, v]) => v);
}

export default async function support(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    // Signed in is the normal case (the form opens from a workshop), but not
    // required: the account may be the very thing that is broken.
    let user = null;
    if (req.headers.authorization) user = await requireUser(req).catch(() => null);
    await enforceRateLimit(req, { name: "support", limit: 3, windowSeconds: 3600, userId: user?.id });

    const b = req.body || {};
    const name = clip(b.name, 120);
    const email = clip(b.email, 200);
    const message = clip(b.message, 2500);
    const country = user?.user_metadata?.country || clip(b.country, 60);
    const phone = normalizeWhatsApp(b.phone, country);
    if (!name) return res.status(400).json({ error: "Indiquez votre nom." });
    if (!/.+@.+\..+/.test(email)) return res.status(400).json({ error: "Entrez une adresse courriel valide." });
    if (!phone.ok) return res.status(400).json({ error: "Entrez un numéro WhatsApp valide, avec l'indicatif du pays (par exemple +213 5XX XX XX XX)." });

    const ctx = typeof b.context === "object" && b.context ? {
      issue: clip(b.context.issue, 200),
      section: b.context.section === "eo" ? "eo" : b.context.section === "ee" ? "ee" : undefined,
      task: Number(b.context.task) || undefined,
      page: clip(b.context.page, 80),
      online: typeof b.context.online === "boolean" ? b.context.online : undefined,
    } : {};
    const device = describeDevice(req.headers["user-agent"]);
    const plan = user ? (isPremiumUser(user) ? user.app_metadata?.plan_label || "Premium" : "gratuit") : "non connecté";
    const lines = contextLines({ ctx, device, plan, phone });

    // 1. The inbox row. The phone and the context go in the message itself:
    //    contact_messages has no column for them, and the admin's message view
    //    already shows the text in full.
    const body = [
      message || "(aucun message — le candidat demande à être rappelé)",
      "",
      "— Contexte technique (joint automatiquement) —",
      ...lines.map(([k, v]) => `${k} : ${v}`),
    ].join("\n").slice(0, 4000);
    const { error: rowError } = await admin.from("contact_messages").insert({
      user_id: user?.id || null, name, email, subject: SUPPORT_SUBJECT, message: body,
    });
    if (rowError) console.warn("support: contact_messages:", rowError.message);

    // 2. The email to the team, Reply-To the candidate.
    let emailed = false;
    if (mailConfigured() && TEAM_ADDRESS) {
      const rows = lines.map(([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;color:#0f172a">${escapeHtml(v)}</td></tr>`).join("");
      const wa = phone.waLink
        ? `<p style="margin:20px 0"><a href="${phone.waLink}" style="display:inline-block;background:#25D366;color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">Appeler sur WhatsApp</a></p>`
        : `<p style="margin:20px 0;color:#b45309">Numéro sans indicatif de pays : vérifiez-le avant d'appeler.</p>`;
      const html = `<div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#0f172a;max-width:560px">
<p style="margin:0 0 4px;font-size:18px;font-weight:700">${escapeHtml(SUPPORT_SUBJECT)}</p>
<p style="margin:0 0 16px;color:#475569">${escapeHtml(name)} · ${escapeHtml(email)}</p>
${message ? `<p style="margin:0 0 16px;white-space:pre-wrap;border-left:3px solid #2E6BE6;padding-left:12px">${escapeHtml(message)}</p>` : ""}
${wa}
<table style="border-collapse:collapse;font-size:14px">${rows}</table>
<p style="margin:20px 0 0;color:#64748b;font-size:13px">Répondre à ce courriel écrit directement au candidat. Le message est aussi dans Administration → Messages.</p>
</div>`;
      try {
        await sendMail({ to: TEAM_ADDRESS, replyTo: `"${name.replace(/"/g, "")}" <${email}>`, subject: `${SUPPORT_SUBJECT} — ${name}`, html });
        emailed = true;
      } catch (err) {
        console.warn("support: email:", err.message);
      }
    }

    if (rowError && !emailed) return res.status(503).json({ error: "L'envoi a échoué. Réessayez dans un instant." });
    return res.status(200).json({ ok: true, emailed, whatsapp: phone.e164 || phone.typed });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "L'envoi a échoué." });
  }
}
