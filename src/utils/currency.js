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

export const DZD = CURRENCIES.find((x) => x.code === "DZD");
export const USD = CURRENCIES[0];

// The currency the pricing tabs should OPEN on for a visitor in `countryCode`
// (ISO-3166, from src/utils/geo.js). Only Algeria is mapped, on purpose: there
// the dinar figure is not a convenience conversion but the amount actually
// transferred by CCP/BaridiMob, so opening on USD hides the only way to buy.
// Everywhere else keeps USD, which is what Stripe really charges — an extra
// country here would just show a converted number and could be added if the
// site ever bills in that currency for real.
export function currencyForCountry(countryCode) {
  return countryCode === "DZ" ? DZD : USD;
}

// The currency the visitor picked by hand, remembered for the tab. Accueil and
// Tarifs each mount their own usePricingSelection(), so without this, someone
// who switched to USD on the landing page would be put back on DZD the moment
// they opened Tarifs — the auto-selection would look like a switch that won't
// stay put.
const CHOICE_KEY = "passerelle.currency";

export const rememberCurrency = (cur) => {
  try { sessionStorage.setItem(CHOICE_KEY, cur?.code || ""); } catch { /* private mode */ }
};

export const rememberedCurrency = () => {
  try { return CURRENCIES.find((x) => x.code === sessionStorage.getItem(CHOICE_KEY)) || null; } catch { return null; }
};

// The DZD amount to charge for a plan on the manual checkout. Prefers the
// owner's per-plan override (a bare number the admin typed, e.g. "2600" →
// "2600 DA"); otherwise falls back to the auto-converted amount from the plan's
// USD price. `overrides` is the site_settings payment_dz.prices map.
export function planDzdAmount(plan, overrides = {}) {
  const raw = overrides?.[plan?.name];
  const num = raw != null && String(raw).trim() !== "" ? String(raw).match(/\d+([.,]\d+)?/) : null;
  if (num) return DZD.format(parseFloat(num[0].replace(",", ".")));
  return convertPrice(plan?.price ?? "$0", DZD);
}

// Takes a percentage off a formatted money string, keeping its formatting
// ("2 600 DZD" → "2 080 DZD"). Used by the DZD manual checkout: a Stripe
// promotion code cannot be attached to a bank transfer, so the discount is
// applied to the amount we ask the buyer to send. Percentage only — a
// fixed-amount coupon is denominated in USD and has no meaning against dinars.
export function applyPercentOff(formatted, percentOff) {
  const pct = Number(percentOff);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return formatted;
  // Strip the thin/non-breaking spaces the fr-DZ formatter uses as thousands
  // separators, along with the currency symbol, to get back to a number.
  const digits = String(formatted).replace(/[^\d.,]/g, "").replace(",", ".");
  const n = parseFloat(digits);
  if (!Number.isFinite(n) || n <= 0) return formatted;
  // Re-format rather than splice the discounted number back into the original
  // string: splicing dropped the separator before the currency symbol ("2 080DA").
  return DZD.format(Math.round(n * (1 - pct / 100)));
}
