import geo from "../_lib/public/geo.js";
import prices from "../_lib/public/prices.js";
import promoValidate from "../_lib/public/promo-validate.js";

// Single serverless function for the small unauthenticated endpoints, exactly
// as api/admin/[resource].js does for the back office.
//
// Vercel counts every file under api/ as one function and the Hobby plan caps
// a deployment at 12. Three one-purpose files — geo, prices, promo-validate —
// were spending three of those twelve on a header read and two Stripe lookups.
// Behind a dynamic segment they cost one, which is what made room for the
// dictée. Any new small public route belongs here rather than in a new file;
// the real handlers live in api/_lib/public/, and underscore-prefixed paths
// are not deployed as functions.
//
// Each handler keeps its own method check, rate limit and cache headers — this
// dispatcher adds no policy of its own, so moving a route in or out of it
// changes nothing about how that route behaves.
const handlers = {
  geo,
  prices,
  "promo-validate": promoValidate,
};

export default async function handler(req, res) {
  const route = handlers[req.query.resource];
  if (!route) return res.status(404).json({ error: "Not found" });
  return route(req, res);
}
