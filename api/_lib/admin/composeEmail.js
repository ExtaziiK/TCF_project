import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { sendMail, mailConfigured } from "../mailer.js";
import { SITE } from "../welcome.js";
import { firstNameOf } from "../emailLayout.js";
import { renderComposed, COMPOSE_MAX_BODY } from "../emailTemplates.js";
import { audit } from "./users.js";

// « Nouveau courriel » (Administration → Emails): a one-off email in the site's
// letter, to one address typed by hand, with optional copies (CC).
//
//   POST /api/admin/compose-email { action: "test" | "send", to, cc, firstName, subject, body }
//        `cc` is a list of addresses (or one string split on , ; or spaces).
//        "test" goes to the admin's own address with "[Test]" in front, never
//        to the CC addresses.
//        "send" goes to `to` and is kept in admin_audit_log (action
//        "send-email", the text in `detail`), which Messages → Envoyés lists.
//        The log is written only after the send went through, so the list
//        never shows an email nobody received.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CC = 10;

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const { action, to, cc, firstName, subject, body } = req.body || {};
    if (action !== "test" && action !== "send") throw new HttpError(400, "Action inconnue.");
    const subj = String(subject || "").trim();
    const text = String(body || "").trim();
    const name = String(firstName || "").trim().slice(0, 60);
    if (!subj) throw new HttpError(400, "L'objet est vide.");
    if (subj.length > 200) throw new HttpError(400, "L'objet dépasse 200 caractères.");
    if (!text) throw new HttpError(400, "Le message est vide.");
    if (text.length > COMPOSE_MAX_BODY) throw new HttpError(400, `Le message dépasse ${COMPOSE_MAX_BODY} caractères.`);
    if (!mailConfigured()) throw new HttpError(503, "Email non configuré (SMTP).");

    if (action === "test") {
      const { subject: s, html } = renderComposed({ subject: subj, body: text }, { firstName: name || firstNameOf(actor), site: SITE });
      await sendMail({ to: actor.email, subject: `[Test] ${s}`, html });
      return res.status(200).json({ ok: true, to: actor.email });
    }

    const addr = String(to || "").trim().toLowerCase();
    if (!EMAIL_RE.test(addr) || addr.length > 200) throw new HttpError(400, "Adresse courriel invalide.");
    const copies = [...new Set((Array.isArray(cc) ? cc : String(cc || "").split(/[\s,;]+/))
      .map((x) => String(x).trim().toLowerCase()).filter(Boolean))].filter((x) => x !== addr);
    const bad = copies.find((x) => !EMAIL_RE.test(x) || x.length > 200);
    if (bad) throw new HttpError(400, `Adresse en copie invalide : ${bad}`);
    if (copies.length > MAX_CC) throw new HttpError(400, `${MAX_CC} adresses en copie au maximum.`);
    const { subject: s, html } = renderComposed({ subject: subj, body: text }, { firstName: name, site: SITE });
    try {
      await sendMail({ to: addr, cc: copies, subject: s, html });
    } catch (err) {
      throw new HttpError(502, `Envoi refusé : ${err.message}`);
    }
    await audit(actor, "send-email", addr, { subject: subj, body: text, firstName: name || null, ...(copies.length ? { cc: copies } : {}) });
    return res.status(200).json({ ok: true, to: addr, cc: copies });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Admin request failed." });
  }
}
