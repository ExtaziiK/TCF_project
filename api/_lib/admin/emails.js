import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { sendMail } from "../mailer.js";
import {
  DEFAULTS, TEMPLATE_META, TEMPLATE_VARS, withDefaults, renderTemplate, sampleVars, shell,
} from "../emailTemplates.js";

// Email template management (admin only). The copy of each transactional email
// lives in public.email_templates; api/_lib/emailTemplates.js holds the shipped
// defaults, used for any template the admin has never saved.
//
//   GET  /api/admin/emails                       → { templates, meta, vars, shell }
//   POST /api/admin/emails { action: "save", key, subject, body, enabled, promoCode }
//   POST /api/admin/emails { action: "reset", key }        → back to the default
//   POST /api/admin/emails { action: "test", key, subject, body, promoCode }
//                            → renders with sample values, sends to the admin
//
// Writes go through the service role (same client as the rest of api/admin),
// and every change is written to admin_audit_log like promo codes are.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://tcfpasserelle.com").replace(/\/$/, "");

async function audit(actor, action, target, detail) {
  await admin.from("admin_audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    target,
    detail: detail || null,
  });
}

// The table is created by supabase/migrations/20260730_email_templates.sql. If
// that has not been applied yet, reads degrade to the defaults and writes say
// so plainly instead of surfacing a raw Postgres error.
const MISSING_TABLE = "Table email_templates absente : appliquez la migration 20260730_email_templates.sql.";

function validate({ subject, body }) {
  const s = String(subject || "").trim();
  const b = String(body || "").trim();
  if (s.length < 1 || s.length > 200) throw new HttpError(400, "L'objet doit faire entre 1 et 200 caractères.");
  if (b.length < 1 || b.length > 8000) throw new HttpError(400, "Le contenu doit faire entre 1 et 8000 caractères.");
  // Catches a section left half-open ({{#promo_code}} with no {{/promo_code}}),
  // which would otherwise print the raw tag in a real customer's inbox.
  for (const [, key] of b.matchAll(/\{\{#(\w+)\}\}/g)) {
    if (!b.includes(`{{/${key}}}`)) throw new HttpError(400, `Section {{#${key}}} non fermée : ajoutez {{/${key}}}.`);
  }
  return { subject: s, body: b };
}

async function handleGet(res) {
  const { data, error } = await admin.from("email_templates").select("*");
  const rows = Object.fromEntries((data || []).map((row) => [row.key, row]));
  return res.status(200).json({
    templates: TEMPLATE_META.map((m) => ({ ...m, ...withDefaults(m.key, rows[m.key]) })),
    defaults: DEFAULTS,
    vars: TEMPLATE_VARS,
    // Ready-to-substitute demo values (links and buttons included) so the
    // admin panel can preview a template without rebuilding them client-side.
    sample: sampleVars(SITE),
    // The branded wrapper, so the admin panel previews exactly what is sent.
    shell: shell("{{content}}"),
    unavailable: !!error,
  });
}

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);

    if (req.method === "GET") return await handleGet(res);

    if (req.method === "POST") {
      const { action, key } = req.body || {};
      if (!DEFAULTS[key]) throw new HttpError(400, "Modèle inconnu.");

      if (action === "save") {
        const { subject, body } = validate(req.body);
        const promoCode = String(req.body.promoCode || "").trim().toUpperCase() || null;
        const { error } = await admin.from("email_templates").upsert(
          {
            key,
            subject,
            body,
            enabled: req.body.enabled !== false,
            promo_code: promoCode,
            updated_at: new Date().toISOString(),
            updated_by: actor.id,
          },
          { onConflict: "key" },
        );
        if (error) throw new HttpError(400, error.message.includes("email_templates") ? MISSING_TABLE : error.message);
        await audit(actor, "update-email-template", key, { enabled: req.body.enabled !== false, promo_code: promoCode });
        return res.status(200).json({ template: withDefaults(key, { ...req.body, promo_code: promoCode, subject, body }) });
      }

      // Deleting the row is the reset: the shipped default takes over again.
      if (action === "reset") {
        const { error } = await admin.from("email_templates").delete().eq("key", key);
        if (error) throw new HttpError(400, error.message);
        await audit(actor, "reset-email-template", key, null);
        return res.status(200).json({ template: withDefaults(key, null) });
      }

      // Sends the copy currently in the editor — unsaved included — to the
      // admin's own address, rendered with the sample values.
      if (action === "test") {
        const { subject, body } = validate(req.body);
        const vars = { ...sampleVars(SITE), promo_code: String(req.body.promoCode || "").trim().toUpperCase() };
        const mail = renderTemplate({ subject, body }, vars);
        try {
          await sendMail({ to: actor.email, subject: `[Test] ${mail.subject}`, html: mail.html });
        } catch (err) {
          throw new HttpError(502, `Envoi impossible : ${err.message}`);
        }
        await audit(actor, "test-email-template", key, { to: actor.email });
        return res.status(200).json({ sentTo: actor.email });
      }

      throw new HttpError(400, "Action inconnue.");
    }

    throw new HttpError(405, "Method not allowed");
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Email template request failed." });
  }
}
