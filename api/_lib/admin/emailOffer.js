import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { mailConfigured } from "../mailer.js";
import { SITE } from "../welcome.js";
import { pendingOffer, sendOffer, loadEmail, MIN_ACTIVE_DAYS, AUDIENCES, campaignOf } from "../offer.js";
import { listAllUsers, audit } from "./users.js";

// The "-50 %" offer's send button (Administration → Emails → Offre -50 %).
// Who qualifies is decided here, never by the browser: see api/_lib/offer.js.
//
//   GET  /api/admin/email-offer                    → { pending: { active, free, all }, minDays, mailConfigured }
//        How many accounts of each audience have not had the SAVED email yet.
//   POST /api/admin/email-offer { action: "send", audience } → { sent, failed, remaining }
//        One batch of BATCH, so a request stays well inside the time limit;
//        the tab calls again while `remaining` > 0.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BATCH = 10;

export default async function handler(req, res) {
  try {
    const actor = await requireAdmin(req);
    if (req.method === "GET") {
      const [users, cfg] = await Promise.all([listAllUsers(), loadEmail(admin, "offer")]);
      const campaign = campaignOf(cfg);
      const counts = await Promise.all(AUDIENCES.map((a) => pendingOffer(admin, users, a, campaign)));
      const pending = Object.fromEntries(AUDIENCES.map((a, i) => [a, counts[i].length]));
      return res.status(200).json({ pending, minDays: MIN_ACTIVE_DAYS, mailConfigured: mailConfigured() });
    }
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    if (req.body?.action !== "send") throw new HttpError(400, "Action inconnue.");
    const audience = req.body.audience || "active";
    if (!AUDIENCES.includes(audience)) throw new HttpError(400, "Destinataires inconnus.");

    const cfg = await loadEmail(admin, "offer");
    if (!cfg.enabled) throw new HttpError(400, "Ce courriel est désactivé. Activez-le d'abord.");
    if (!mailConfigured()) throw new HttpError(503, "Email non configuré (SMTP).");
    const todo = await pendingOffer(admin, await listAllUsers(), audience, campaignOf(cfg));
    const sent = [];
    const failed = [];
    for (const u of todo.slice(0, BATCH)) {
      try {
        await sendOffer(admin, u, cfg, SITE, audience);
        sent.push(u.email);
      } catch (err) {
        console.error(`email-offer: send to ${u.email} failed:`, err.message);
        failed.push(u.email);
      }
    }
    if (sent.length) await audit(actor, "offer-send", `${sent.length} compte(s)`, { audience, subject: cfg.subject, code: cfg.promoCode, sent, failed });
    return res.status(200).json({ ok: true, sent: sent.length, failed, remaining: todo.length - sent.length });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Admin request failed." });
  }
}
