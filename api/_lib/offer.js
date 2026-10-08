import { sendMail, mailConfigured } from "./mailer.js";
import { loadEmail } from "./emails.js";
import { renderEmail, paymentPhrase, saleEndPhrase } from "./emailTemplates.js";
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

// Who a send goes to, picked in the admin tab:
//   active — the rule above (practised 2+ days, never paid, never offered);
//   free   — every account without a pass running right now;
//   all    — every account.
// All three skip unconfirmed addresses and accounts being deleted. Staff are
// skipped by "active", but admins and owners are part of "free" and "all"
// (whatever their pass) so the team receives the real email with everyone
// else and sees what went out; moderators never get it.
//
// Whatever the audience, nobody gets the same email twice: every send stamps
// app_metadata.offer_campaign with the email's subject, and an account already
// stamped with that subject is skipped. Sending to "active" then to "all"
// therefore only reaches the ones the first send missed — and a NEW subject
// is a new campaign that everyone can receive again.
export const AUDIENCES = ["active", "free", "all"];
// One stamp per hand-sent email (the -50 % offer, the weekend sale…), so
// sending one never marks an account as having had the other.
const campaignKey = (id) => `${id}_campaign`;
export const campaignOf = (cfg) => String(cfg?.subject || "").trim().slice(0, 150);

const passRunning = (m) => m.plan === "Premium" && (!m.premium_until || Date.parse(m.premium_until) > Date.now());

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
export async function pendingOffer(admin, users, audience = "active", campaign = "", id = "offer") {
  const CAMPAIGN = campaignKey(id);
  const team = (u) => ["admin", "owner"].includes(u.app_metadata?.role);
  const reachable = users.filter((u) => {
    const m = u.app_metadata || {};
    if (!u.email || !(u.email_confirmed_at || u.confirmed_at)) return false;
    if (m.role === "moderator" || (team(u) && audience === "active")) return false;
    if (m.deletion_scheduled_for) return false;
    return !campaign || m[CAMPAIGN] !== campaign;
  });
  if (audience === "all") return reachable;
  if (audience === "free") return reachable.filter((u) => team(u) || !passRunning(u.app_metadata || {}));
  const [days, requests] = await Promise.all([activeDays(admin), allRows(admin, "subscription_requests", "user_id,status")]);
  const paid = new Set(requests.filter((r) => r.status === "approved").map((r) => r.user_id));
  return reachable
    .filter((u) => {
      const m = u.app_metadata || {};
      if (m[STAMP]) return false;
      if (everHadAccess(m, paid, u.id)) return false;
      return (days.get(u.id) || 0) >= MIN_ACTIVE_DAYS;
    })
    .sort((a, b) => (days.get(b.id) || 0) - (days.get(a.id) || 0));
}

// Throws on failure (stamps restored). `cfg` = the saved email `id`.
// The "active" audience also sets the once-per-account stamp of that rule.
export async function sendOffer(admin, user, cfg, site, audience = "active", id = "offer") {
  if (!mailConfigured()) throw new Error("Email non configuré (SMTP).");
  const meta = user.app_metadata || {};
  const set = (patch) => admin.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, ...patch } });
  const sent = { [campaignKey(id)]: campaignOf(cfg), ...(audience === "active" ? { [STAMP]: new Date().toISOString() } : {}) };
  const { error } = await set(sent);
  if (error) throw new Error(error.message);
  try {
    const vars = { paiement: paymentPhrase(user), fin: saleEndPhrase(user) };
    const { subject, html } = renderEmail(id, cfg, { firstName: firstNameOf(user), vars, site });
    await sendMail({ to: user.email, subject, html });
  } catch (err) {
    await set(Object.fromEntries(Object.keys(sent).map((k) => [k, meta[k] ?? null])));
    throw err;
  }
}

export { loadEmail };
