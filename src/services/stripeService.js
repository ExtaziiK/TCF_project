import { supabase } from "@/services/supabaseClient";

// Starts a Stripe Checkout session for the given price and redirects the
// browser to Stripe's hosted payment page. The session is created server-side
// (api/create-checkout-session) since it needs the Stripe secret key.
export async function startCheckout(priceId) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not-authenticated");

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ priceId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "checkout-failed");
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
