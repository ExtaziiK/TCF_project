import { supabase } from "@/services/supabaseClient";
import { parseDzd } from "@/utils/currency";

// The dinar ledger behind the admin "Revenus" tab. Money arrives two ways:
//
//   1. An approved subscription_request — the DZD checkout inbox ("Demandes").
//      Approving the request IS the sale: that is when the owner has seen the
//      receipt and the transfer is confirmed.
//   2. A revenue_entry — anything taken outside that flow: cash in hand, a
//      transfer settled over WhatsApp, a pass granted by hand from the
//      Utilisateurs tab. Without it those sales would never be counted.
//
// Both are normalised into one "sale" shape here so the tab never has to care
// which table a row came from. Everything goes straight to Supabase under the
// admin RLS policies (20260725_dz_payments.sql, 20260807_revenue.sql) — no
// serverless hop, so the tab works in local `vite` too.
//
// Stripe (USD) revenue is not counted here on purpose: Stripe's own dashboard
// is the ledger for it, and summing two currencies in one column is how books
// go wrong.

export const MANUAL_METHODS = [
  ["cash", "Espèces"],
  ["ccp", "CCP"],
  ["baridimob", "BaridiMob"],
  ["other", "Autre"],
];

// One approved request → one sale. `date` is the approval, not the submission:
// a request sent on the 31st and approved on the 1st belongs to the new month.
// Rows predating the 20260807_revenue migration have neither column, hence the
// fallbacks — created_at for the date, the display text for the amount.
const saleFromRequest = (r) => {
  const stored = r.amount_received_dzd;
  return {
    key: `req:${r.id}`,
    id: r.id,
    source: "request",
    date: r.approved_at || r.created_at,
    amount: stored != null ? Number(stored) : parseDzd(r.amount_dzd),
    // True when the figure was inferred from the checkout text rather than
    // confirmed by the owner — shown as "auto" so it can be corrected.
    inferred: stored == null,
    plan: r.plan || null,
    method: r.method || null,
    customer: r.name || null,
    email: r.email || null,
    notes: r.notes || null,
  };
};

const saleFromEntry = (e) => ({
  key: `man:${e.id}`,
  id: e.id,
  source: "manual",
  date: e.occurred_at,
  amount: e.amount_dzd == null ? null : Number(e.amount_dzd),
  inferred: false,
  plan: e.plan || null,
  method: e.method || null,
  customer: e.customer || null,
  email: e.email || null,
  notes: e.notes || null,
});

// A write that lands on a table or column the 20260807_revenue migration was
// supposed to create fails with PostgREST's own wording ("Could not find the
// 'amount_received_dzd' column … in the schema cache"), which tells the owner
// nothing they can act on. Trade it for the one instruction that fixes it.
const MIGRATION_HINT = "Migration 20260807_revenue.sql non appliquée : exécutez-la dans l'éditeur SQL Supabase pour enregistrer les montants.";
const friendly = (error) => {
  if (!error) return undefined;
  const m = error.message || String(error);
  return /schema cache|does not exist|could not find/i.test(m) ? MIGRATION_HINT : m;
};

// Every counted sale, newest first. Each source degrades on its own: a missing
// revenue_entries table (migration not applied) still leaves the approved
// requests countable, and the tab says which half is missing.
export async function listRevenue() {
  const [reqs, entries] = await Promise.all([
    supabase.from("subscription_requests").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(1000),
    supabase.from("revenue_entries").select("*").order("occurred_at", { ascending: false }).limit(1000),
  ]);

  const sales = [
    ...(reqs.data || []).map(saleFromRequest),
    ...(entries.data || []).map(saleFromEntry),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    ok: !reqs.error,
    requestsUnavailable: !!reqs.error,
    entriesUnavailable: !!entries.error,
    // The requests read survives the missing migration (select * returns
    // whatever columns exist), so nothing else would reveal that amounts are
    // not yet writable — until the owner tries to correct one and is refused.
    // Absence of the column on a returned row is the tell; say so up front.
    columnsUnavailable: (reqs.data || []).some((r) => !("amount_received_dzd" in r)),
    sales,
  };
}

// Corrects what an approved request really brought in (a partial transfer, a
// rounding, a promo the buyer negotiated). Passing null clears the correction
// and falls the row back to its checkout amount.
export async function setRequestAmount(id, amount) {
  const { error } = await supabase
    .from("subscription_requests")
    .update({ amount_received_dzd: amount })
    .eq("id", id);
  return { ok: !error, error: friendly(error) };
}

export async function addRevenueEntry({ occurredAt, amount, plan, method, customer, email, notes }) {
  const { error } = await supabase.from("revenue_entries").insert({
    occurred_at: occurredAt || new Date().toISOString(),
    amount_dzd: amount,
    plan: plan ? String(plan).slice(0, 60) : null,
    method: MANUAL_METHODS.some(([k]) => k === method) ? method : "cash",
    customer: customer ? String(customer).trim().slice(0, 120) : null,
    email: email ? String(email).trim().slice(0, 200) : null,
    notes: notes ? String(notes).trim().slice(0, 2000) : null,
  });
  return { ok: !error, error: friendly(error) };
}

export async function updateRevenueEntry(id, patch) {
  const { error } = await supabase.from("revenue_entries").update(patch).eq("id", id);
  return { ok: !error, error: friendly(error) };
}

export async function deleteRevenueEntry(id) {
  const { error } = await supabase.from("revenue_entries").delete().eq("id", id);
  return { ok: !error, error: friendly(error) };
}
