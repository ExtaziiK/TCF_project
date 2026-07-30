// The passes we sell, server-side. One-time purchases, each opening Premium for
// a fixed number of days — the model CGU section 6 describes ("Chaque pass est
// un achat unique… Il n'y a pas de reconduction tacite").
//
// Keep in sync with src/constants/pricing.js, which is the same table for the
// browser. Duplicated rather than imported on purpose: api/ functions bundle
// separately from the client, and pulling a src/constants module in would drag
// client-only imports into a serverless function.
//
// `days` lives here, not in Stripe: a one-time price has no billing period, so
// the access window has to come from our own table. It is the single place that
// decides how long a purchase grants — the webhook reads it to compute
// premium_until, and the checkout endpoint uses the keys as its allow-list.
export const PASSES = {
  price_1TuaWRCFsAOkGQj0WeMgaejo: { label: "Passeport", days: 5 },
  price_1TuaZYCFsAOkGQj0OCxA6IWA: { label: "Visa", days: 15 },
  price_1TuabOCFsAOkGQj0M6cOUnxr: { label: "Première classe", days: 30 },
  price_1TuadPCFsAOkGQj0QXGKdRGS: { label: "VIP", days: 90 },
};

export const isSellablePass = (priceId) => Object.prototype.hasOwnProperty.call(PASSES, priceId);

// When a pass bought now should expire.
export function passExpiryISO(priceId, from = Date.now()) {
  const pass = PASSES[priceId];
  if (!pass) return null;
  return new Date(from + pass.days * 24 * 60 * 60 * 1000).toISOString();
}
