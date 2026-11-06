import Stripe from "stripe";

// Two per-account facts for Administration › Utilisateurs, gathered for the
// whole list in a handful of queries (never one per user):
//
//   · countries — where the account connects from (user_countries, filled by
//     POST /api/public/geo; migration 20261106_user_countries.sql).
//   · payments  — when, how much and how the account paid: Stripe Checkout
//     sessions (card), approved DZD requests (CCP / BaridiMob) and the
//     payments an admin entered by hand in Revenus (matched by email address).
//
// Each source degrades on its own: a missing table or an unreachable Stripe
// just leaves that part empty, and the users list still loads.

let stripeClient = null;
const stripe = () => (stripeClient ||= new Stripe(process.env.STRIPE_SECRET_KEY));

// The Stripe side is the slow one (paged API). Cached per warm function for a
// few minutes: the users list is reloaded on every search keystroke and page
// change, and a payment made in the last minutes still shows via the user's
// own plan fields.
const STRIPE_TTL_MS = 5 * 60 * 1000;
const STRIPE_MAX = 1000;
let stripeCache = { at: 0, rows: null };

async function stripePayments() {
  if (!process.env.STRIPE_SECRET_KEY) return [];
  if (stripeCache.rows && Date.now() - stripeCache.at < STRIPE_TTL_MS) return stripeCache.rows;
  const sessions = await stripe().checkout.sessions.list({ limit: 100, status: "complete" }).autoPagingToArray({ limit: STRIPE_MAX });
  const rows = sessions
    .filter((s) => s.payment_status === "paid")
    .map((s) => ({
      userId: s.client_reference_id || s.metadata?.supabase_user_id || null,
      email: s.customer_details?.email || s.customer_email || null,
      date: new Date(s.created * 1000).toISOString(),
      source: "stripe",
      amount: typeof s.amount_total === "number" ? s.amount_total / 100 : null,
      currency: s.currency || "usd",
      plan: s.metadata?.plan || null,
      method: "card",
    }));
  stripeCache = { at: Date.now(), rows };
  return rows;
}

const digits = (text) => {
  const n = Number(String(text || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function loadCountries(admin, ids) {
  if (!ids.length) return {};
  const { data, error } = await admin
    .from("user_countries")
    .select("user_id, country, first_seen_at, last_seen_at, visits")
    .in("user_id", ids);
  if (error) return {}; // migration not applied yet
  const out = {};
  for (const r of data || []) {
    (out[r.user_id] ||= []).push({ country: r.country, firstSeenAt: r.first_seen_at, lastSeenAt: r.last_seen_at, visits: r.visits });
  }
  for (const list of Object.values(out)) list.sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
  return out;
}

// userId → payments, newest first. `users` is the auth user list, used to tie
// email-only rows (manual entries, old requests) back to an account.
export async function loadPayments(admin, users) {
  const byEmail = new Map(users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u.id]));
  const owner = (userId, email) => userId || (email ? byEmail.get(String(email).toLowerCase()) : null) || null;

  const [reqs, entries, card] = await Promise.all([
    admin.from("subscription_requests").select("*").eq("status", "approved").limit(5000),
    admin.from("revenue_entries").select("*").limit(5000),
    stripePayments().catch((err) => { console.error("userInsights stripe:", err.message); return []; }),
  ]);

  const all = [
    ...card,
    ...(reqs.data || []).map((r) => ({
      userId: r.user_id, email: r.email,
      date: r.approved_at || r.created_at,
      source: "dzd",
      amount: r.amount_received_dzd != null ? Number(r.amount_received_dzd) : digits(r.amount_dzd),
      currency: "dzd",
      plan: r.plan || null,
      method: r.method || null,
    })),
    ...(entries.data || []).map((e) => ({
      userId: null, email: e.email,
      date: e.occurred_at,
      source: "manual",
      amount: e.amount_dzd != null ? Number(e.amount_dzd) : null,
      currency: "dzd",
      plan: e.plan || null,
      method: e.method || null,
    })),
  ];

  const out = {};
  for (const p of all) {
    const id = owner(p.userId, p.email);
    if (!id || !p.date) continue;
    // Only what the panel shows travels: not the buyer email, already on the row.
    (out[id] ||= []).push({ date: p.date, source: p.source, amount: p.amount, currency: p.currency, plan: p.plan, method: p.method });
  }
  for (const list of Object.values(out)) list.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return out;
}
