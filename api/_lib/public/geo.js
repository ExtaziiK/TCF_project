import { createClient } from "@supabase/supabase-js";

// Where the request came from, as an ISO-3166 country code:
//
//   GET  /api/public/geo  →  { country: "DZ" }   (or { country: null })
//   POST /api/public/geo  (signed in) → records that country against the
//                         account, for Administration › Utilisateurs
//
// Vercel resolves the client IP at the edge and puts the result on
// `x-vercel-ip-country`. A browser cannot see the country of its own IP, so
// the pricing UI asks here: an Algerian visitor gets the dinar tab selected on
// arrival (see src/utils/geo.js), because in Algeria the DZD figure is not a
// convenience conversion — CCP/BaridiMob is the only way to actually buy.
//
// GET is deliberately not rate limited: the handler reads one request header
// and calls nothing downstream, so enforceRateLimit's own Postgres round-trip
// would cost strictly more than the endpoint it protects. POST is called once
// per browser tab by the client (src/utils/geo.js → reportConnectionCountry),
// requires a valid session, and is a single upsert.

// Built on first use: GET must keep working even where the Supabase env vars
// are missing (a preview without secrets).
let client = null;
const admin = () => (client ||= createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
}));

const countryOf = (req) => {
  const country = String(req.headers["x-vercel-ip-country"] || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : null;
};

async function record(req, res) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "auth-required" });
  const country = countryOf(req);
  // No header (local dev, unresolved IP): nothing to record, not an error.
  if (!country) return res.status(200).json({ ok: true, country: null });
  try {
    const { data, error } = await admin().auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "invalid-session" });
    const { error: rpcError } = await admin().rpc("record_user_country", { p_user: data.user.id, p_country: country });
    // Table missing (migration 20261106_user_countries.sql not applied yet):
    // say so in the logs, but the visitor has nothing to do about it.
    if (rpcError) console.error("geo record:", rpcError.message);
    return res.status(200).json({ ok: !rpcError, country });
  } catch (err) {
    console.error("geo record:", err.message);
    return res.status(200).json({ ok: false, country });
  }
}

export default async function handler(req, res) {
  // The answer is specific to one visitor's IP — a shared/CDN cache would hand
  // the first caller's country to everyone behind it. Private, and never stored.
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "POST") return record(req, res);
  if (req.method !== "GET") return res.status(405).end();
  // null rather than a guess when the header is absent (local dev without geo,
  // or an unresolved IP): the client then keeps its own reading instead of
  // being told "not Algeria" on no evidence.
  res.status(200).json({ country: countryOf(req) });
}
