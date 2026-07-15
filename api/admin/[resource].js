import users from "../_lib/admin/users.js";
import stats from "../_lib/admin/stats.js";
import usage from "../_lib/admin/usage.js";
import promo from "../_lib/admin/promo.js";

// Single serverless function for the whole admin API. Vercel counts every
// file under api/ as one function, and the Hobby plan caps a deployment at
// 12 — a dynamic segment keeps /api/admin/users, /api/admin/stats,
// /api/admin/usage and /api/admin/promo as one function instead of four.
// The real handlers live in api/_lib/admin/ (underscore-prefixed paths are
// not deployed as functions); each still does its own requireAdmin check.
const handlers = { users, stats, usage, promo };

export default async function handler(req, res) {
  const route = handlers[req.query.resource];
  if (!route) return res.status(404).json({ error: "Not found" });
  return route(req, res);
}
