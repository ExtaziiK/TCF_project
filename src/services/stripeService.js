import { supabase } from "@/services/supabaseClient";

// Starts a Stripe Checkout session for the given price (optionally carrying a
// validated promo code) and redirects the browser to Stripe's hosted payment
// page. The session is created server-side (api/create-checkout-session)
// since it needs the Stripe secret key.
export async function startCheckout(priceId, promoCode) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not-authenticated");

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ priceId, promoCode: promoCode || null }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "checkout-failed");
  window.location.href = json.url;
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

// Human label for a promo discount ("−20 %", "−5 $ CAD").
export function promoLabel(promo) {
  if (!promo) return "";
  return promo.percentOff
    ? `−${promo.percentOff} %`
    : `−${formatAmount(promo.amountOff || 0, promo.currency || "cad")}`;
}

// Redirects a subscriber to the Stripe billing portal (manage card, invoices,
// cancel). Created server-side (api/create-portal-session) from the customer
// id stored on their app_metadata.
export async function openBillingPortal() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not-authenticated");

  const res = await fetch("/api/create-portal-session", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "portal-failed");
  window.location.href = json.url;
}

const INTERVAL_LABELS = { month: "mois", year: "an" };

function formatAmount(amountInCents, currency) {
  const isWhole = amountInCents % 100 === 0;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(amountInCents / 100);
}

// Overlays live Stripe price/currency/interval onto the static PLANS config
// (which keeps its hand-written price as a fallback if this fetch fails, so
// the page never looks broken). perSuffix carries marketing copy Stripe
// doesn't know about (e.g. "2 mois offerts"), appended after the live cadence.
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
      const interval = INTERVAL_LABELS[live.interval] || live.interval;
      const per = `${live.currency.toUpperCase()} / ${interval}${p.perSuffix ? ` ${p.perSuffix}` : ""}`;
      return { ...p, price: formatAmount(live.amount, live.currency), per };
    });
  } catch {
    return plans;
  }
}
