import { sendMail, mailConfigured } from "./mailer.js";
import { loadEmail } from "./emails.js";
import { renderEmail, paymentPhrase } from "./emailTemplates.js";
import { firstNameOf } from "./emailLayout.js";

// The "-50 %" offer (EMAIL_TEMPLATES.offer), sent by hand from Administration →
// Emails to accounts that use the site without ever having paid.
//
// "Use the site" = real activity on at least MIN_ACTIVE_DAYS different days
// (Toronto calendar days): answers to questions, TCF blancs started, AI
// corrections. Sign-ins are not readable from here (Supabase keeps them in the
// auth audit log, outside the API), and practising says more than logging in.
//
// "Never paid" = no trace of ANY access: no Stripe customer, no pass date or
// tier, no expiry reminder ever sent, no approved DZD request. A gift pass
// counts as access too — those accounts already know the paid side.
//
// Once per account: app_metadata.offer_email_sent_at, stamped before sending
// and cleared again if the send fails. The recipients of the 2026-09-16 TCF50
// campaign (enquete/envois-effectues.log, not readable by the server) were
// stamped with that date so they are skipped.

export const MIN_ACTIVE_DAYS = 2;
const STAMP = "offer_email_sent_at";

async function allRows(admin, table, cols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(cols).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

const day = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

// user id → number of distinct active days.
async function activeDays(admin) {
  const days = new Map();
  const add = (uid, iso) => {
    if (!uid || !iso) return;
    if (!days.has(uid)) days.set(uid, new Set());
    days.get(uid).add(day(iso));
  };
  for (const r of await allRows(admin, "question_attempts", "user_id,created_at")) add(r.user_id, r.created_at);
  for (const r of await allRows(admin, "exam_attempts", "user_id,started_at")) add(r.user_id, r.started_at);
  for (const r of await allRows(admin, "ai_usage_log", "user_id,created_at")) add(r.user_id, r.created_at);
  return new Map([...days].map(([k, v]) => [k, v.size]));
}

function everHadAccess(meta, paidRequests, id) {
  return !!(meta.stripe_customer_id || meta.premium_until || meta.plan_label || meta.plan === "Premium"
    || meta.reminder_expiring_at || meta.reminder_expired_at || paidRequests.has(id));
}

// Accounts that should get the offer and have not, most active first.
export async function pendingOffer(admin, users) {
  const [days, requests] = await Promise.all([activeDays(admin), allRows(admin, "subscription_requests", "user_id,status")]);
  const paid = new Set(requests.filter((r) => r.status === "approved").map((r) => r.user_id));
  return users
    .filter((u) => {
      const m = u.app_metadata || {};
      if (!u.email || !(u.email_confirmed_at || u.confirmed_at)) return false;
      if (["admin", "owner", "moderator"].includes(m.role)) return false;
      if (m.deletion_scheduled_for || m[STAMP]) return false;
      if (everHadAccess(m, paid, u.id)) return false;
      return (days.get(u.id) || 0) >= MIN_ACTIVE_DAYS;
    })
    .sort((a, b) => (days.get(b.id) || 0) - (days.get(a.id) || 0));
}

// Throws on failure (stamp cleared). `cfg` = the saved offer email.
export async function sendOffer(admin, user, cfg, site) {
  if (!mailConfigured()) throw new Error("Email non configuré (SMTP).");
  const meta = user.app_metadata || {};
  const stamp = (v) => admin.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, [STAMP]: v } });
  const { error } = await stamp(new Date().toISOString());
  if (error) throw new Error(error.message);
  try {
    const { subject, html } = renderEmail("offer", cfg, { firstName: firstNameOf(user), vars: { paiement: paymentPhrase(user) }, site });
    await sendMail({ to: user.email, subject, html });
  } catch (err) {
    await stamp(null);
    throw err;
  }
}

export { loadEmail };
