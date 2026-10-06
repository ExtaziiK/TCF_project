import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { sendMail, mailConfigured } from "../mailer.js";
import { normalizeWelcome, renderWelcome, firstNameOf } from "../welcomeTemplate.js";
import { EMAIL_TEMPLATES, renderEmail } from "../emailTemplates.js";
import { SITE, loadWelcomeConfig, welcomeSkipReason, sendWelcome } from "../welcome.js";
import { listAllUsers, audit } from "./users.js";

// The welcome email, from Administration → Emails. Editing its text and the
// on/off switch are plain site_settings writes from the browser (admin RLS);
// this route covers what needs the SMTP mailbox or the account list.
//
//   GET  /api/admin/welcome-email                       → { pending, mailConfigured }
//   POST /api/admin/welcome-email { action: "test", draft, template? }
//        Sends the draft (saved or not) to the admin's own address. Nothing
//        is stamped: a test is not the account's welcome. `template` picks one
//        of the other account emails (api/_lib/emailTemplates.js), rendered
//        with its sample values; omitted = the welcome email.
//   POST /api/admin/welcome-email { action: "send-recent" }
//        Sends the SAVED email to accounts that should have had it and did not
//        (confirmed, created in the window, never sent). BATCH per call so a
//        request stays well inside the function's time limit; the tab calls
//        again while `remaining` > 0.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BATCH = 10;

const pendingAccounts = async () =>
  (await listAllUsers())
    .filter((u) => !welcomeSkipReason(u))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

async function handlePost(req, res, actor) {
  const action = req.body?.action;

  if (action === "test") {
    if (!mailConfigured()) throw new HttpError(503, "Email non configuré (SMTP).");
    const id = req.body.template;
    if (id && !EMAIL_TEMPLATES[id]) throw new HttpError(400, "Modèle inconnu.");
    const { subject, html } = id
      ? renderEmail(id, req.body.draft, { firstName: firstNameOf(actor), site: SITE })
      : renderWelcome(normalizeWelcome(req.body.draft), { firstName: firstNameOf(actor), site: SITE });
    await sendMail({ to: actor.email, subject: `[Test] ${subject}`, html });
    return res.status(200).json({ ok: true, to: actor.email });
  }

  if (action === "send-recent") {
    const cfg = await loadWelcomeConfig(admin);
    if (!cfg.enabled) throw new HttpError(400, "Le courriel de bienvenue est désactivé. Activez-le et enregistrez d'abord.");
    const todo = await pendingAccounts();
    const sent = [];
    const failed = [];
    for (const u of todo.slice(0, BATCH)) {
      try {
        await sendWelcome(admin, u, cfg);
        sent.push(u.email);
      } catch (err) {
        console.error(`welcome-email: send to ${u.email} failed:`, err.message);
        failed.push(u.email);
      }
    }
    if (sent.length) await audit(actor, "welcome-send", `${sent.length} compte(s)`, { sent, failed });
    // Failures stay pending, so "remaining" counts them; the tab stops when a
    // batch sends nothing rather than retrying the same failures forever.
    return res.status(200).json({ ok: true, sent: sent.length, failed, remaining: todo.length - sent.length });
  }

  throw new HttpError(400, "Action inconnue.");
}

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);
    if (req.method === "GET") {
      return res.status(200).json({ pending: (await pendingAccounts()).length, mailConfigured: mailConfigured() });
    }
    if (req.method === "POST") return await handlePost(req, res, actor);
    throw new HttpError(405, "Method not allowed");
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Admin request failed." });
  }
}
