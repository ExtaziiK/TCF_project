// Where the request came from, as an ISO-3166 country code:
//
//   GET /api/geo  →  { country: "DZ" }   (or { country: null })
//
// Vercel resolves the client IP at the edge and puts the result on
// `x-vercel-ip-country`. A browser cannot see the country of its own IP, so
// the pricing UI asks here: an Algerian visitor gets the dinar tab selected on
// arrival (see src/utils/geo.js), because in Algeria the DZD figure is not a
// convenience conversion — CCP/BaridiMob is the only way to actually buy.
//
// Deliberately not rate limited: the handler reads one request header and
// calls nothing downstream, so enforceRateLimit's own Postgres round-trip
// would cost strictly more than the endpoint it protects.
export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const country = String(req.headers["x-vercel-ip-country"] || "").trim().toUpperCase();
  // The answer is specific to one visitor's IP — a shared/CDN cache would hand
  // the first caller's country to everyone behind it. Private, and never stored.
  res.setHeader("Cache-Control", "private, no-store");
  // null rather than a guess when the header is absent (local `vercel dev`
  // without geo, or an unresolved IP): the client then keeps its own reading
  // instead of being told "not Algeria" on no evidence.
  res.status(200).json({ country: /^[A-Z]{2}$/.test(country) ? country : null });
}
