import { supabase } from "@/services/supabaseClient";
import { TERMS_VERSION } from "@/constants/terms";

// Starts a Stripe Checkout session for the given price (optionally carrying a
// validated promo code) and redirects the browser to Stripe's hosted payment
// page. The session is created server-side (api/create-checkout-session)
// since it needs the Stripe secret key.
// `withdrawalWaiver` must be the buyer's own acknowledgement, collected before
// this is called (WithdrawalWaiverDialog). The server refuses the session
// without it and records it — see api/create-checkout-session.js and CGU s.7 —
// so passing it from anywhere that did not actually ask the user defeats the
// point of having it.
export async function startCheckout(priceId, promoCode, { withdrawalWaiver = false } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not-authenticated");

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ priceId, promoCode: promoCode || null, withdrawalWaiver, termsVersion: TERMS_VERSION }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "checkout-failed");
  window.location.href = json.url;
}

// Asks the server to apply a completed Checkout session's pass right now,
// rather than waiting for Stripe's webhook to arrive. The webhook is
// asynchronous and races the redirect, so relying on it alone left the buyer
// staring at a free-looking account. The server verifies the session belongs to
// this user and is paid before granting, and the operation is idempotent — the
// webhook applying the same patch afterwards changes nothing.
//
// Returns { ok: true } once granted, { pending: true } while Stripe has not
// settled it yet (an asynchronous payment method), or { ok: false } on error.
export async function confirmCheckout(sessionId) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token || !sessionId) return { ok: false };

  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 202) return { ok: false, pending: true };
    return res.ok ? { ok: true, ...json } : { ok: false, error: json.error };
  } catch {
    return { ok: false };
  }
}

// Checks a promo code against Stripe (api/promo-validate) so the Pricing page
// can show the real discount before checkout. Fails closed: network errors or
// the local-dev 404 read as "not valid" (with `unavailable` set for the 404
// so the UI can explain why).
export async function validatePromoCode(code) {
  try {
    const res = await fetch(`/api/promo-validate?code=${encodeURIComponent(code)}`);
    // Local `vite` has no serverless routes: GET /api/* returns 404 or the raw
    // source file (200, text/javascript) — either way, not a JSON verdict.
    const isJson = (res.headers.get("content-type") || "").includes("json");
    if (res.status === 404 || !isJson) return { valid: false, unavailable: true };
    const json = await res.json().catch(() => ({}));
    return res.ok && json.valid ? json : { valid: false };
  } catch {
    return { valid: false };
  }
}

// Human label for a promo discount ("−20 %", "−$5").
export function promoLabel(promo) {
  if (!promo) return "";
  return promo.percentOff
    ? `−${promo.percentOff} %`
    : `−${formatAmount(promo.amountOff || 0, promo.currency || "usd")}`;
}

// No billing portal: a pass is a one-time purchase, so there is no card on
// file to update, no renewal to cancel and no subscription to manage. Receipts
// are emailed by Stripe on payment. api/create-portal-session.js was deleted
// with this, freeing one of the twelve function slots.

function formatAmount(amountInCents, currency) {
  const isWhole = amountInCents % 100 === 0;
  // American formatting for USD ("$4.99") — everything we charge. Any other
  // currency can only come from a legacy coupon, so fr-CA is a safe fallback.
  const locale = currency.toLowerCase() === "usd" ? "en-US" : "fr-CA";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(amountInCents / 100);
}

// Overlays the live Stripe amount onto the static PLANS config (which keeps its
// hand-written price as a fallback if this fetch fails, so the page never looks
// broken). The `per` line stays static: it describes each pass's access
// duration (e.g. "accès 5 jours"), which the price object doesn't carry.
export async function fetchLivePlans(plans) {
  const ids = plans.map((p) => p.priceId).filter(Boolean);
  if (!ids.length) return plans;
  try {
    const res = await fetch(`/api/prices?ids=${encodeURIComponent(ids.join(","))}`);
    if (!res.ok) return plans;
    const byId = await res.json();
    return plans.map((p) => {
      const live = p.priceId && byId[p.priceId];
      if (!live || live.amount == null) return p;
      return { ...p, price: formatAmount(live.amount, live.currency) };
    });
  } catch {
    return plans;
  }
}
