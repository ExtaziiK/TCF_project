// Display-only currency switcher for the Pricing page. Checkout always charges
// in USD via Stripe (see stripeService.startCheckout); these converted figures
// are indicative, so visitors in Europe, Algeria and Canada can gauge the cost
// in their own currency at a glance.
//
// Rates are approximate and hand-maintained — update them when they drift. The
// formatted strings deliberately keep a dot-decimal, symbol-prefixed shape
// (like the base "$4.99") and NO thousands separators, because PlanCard derives
// the struck "−50 %" price and any promo preview by regex-parsing the numeric
// part of this string; a space or comma grouping would break that math.
const money2 = (v) => {
  const r = Math.round(v * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

export const CURRENCIES = [
  { code: "USD", label: "USD (International)", rate: 1, format: null },
  { code: "EUR", label: "EUR (Europe)", rate: 0.92, format: (v) => `€${money2(v)}` },
  // DZD carries no cents in practice; round to the nearest 10 for a clean figure.
  { code: "DZD", label: "DZD (Algérie)", rate: 135, format: (v) => `${Math.round(v / 10) * 10} DA` },
];

// Rewrites a USD price string ("$4.99", "$0") into the given currency. USD (or
// anything unparseable) is returned untouched so the live Stripe formatting is
// preserved. Free plans ("$0") convert to a plain zero ("€0", "0 DA").
export function convertPrice(usdPrice, currency) {
  if (!currency || currency.code === "USD" || !currency.format) return usdPrice;
  const m = String(usdPrice).match(/\d+([.,]\d+)?/);
  if (!m) return usdPrice;
  const usd = parseFloat(m[0].replace(",", "."));
  if (Number.isNaN(usd)) return usdPrice;
  return currency.format(usd * currency.rate);
}
