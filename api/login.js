import { createClient } from "@supabase/supabase-js";
import { enforceRateLimit } from "./_lib/ratelimit.js";

// Password login with username-or-email support and a brute-force lockout.
// Runs server-side because (a) resolving a username to its email needs the
// service-role key (the browser must never see other users' emails) and
// (b) a "5 tries then 10-minute block" is only real if it can't be reset by
// clearing browser storage.
//
// The lockout counter is keyed by account AND caller IP, so a stranger who
// hammers someone's email with wrong passwords only locks the account for
// their own IP — the legitimate owner, on their own connection, is unaffected.

const url = process.env.VITE_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 10 * 60;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // The per-account lockout below only slows attacks on ONE account; this
  // per-IP cap also blunts password spraying across many accounts.
  try {
    await enforceRateLimit(req, { name: "login", limit: 20, windowSeconds: 60 });
  } catch (err) {
    return res.status(err.status || 429).json({ error: "locked", locked: true, retryAfter: 60 });
  }

  const { identifier, password, deviceSession: currentDevice } = req.body || {};
  if (!identifier || !password) return res.status(400).json({ error: "missing", message: "Identifiant et mot de passe requis." });

  const raw = String(identifier).trim().slice(0, 200);

  // Resolve username -> email (service role). Unknown usernames fall through
  // with the raw value so the sign-in simply fails, revealing nothing about
  // whether the account exists.
  let email = raw;
  if (!raw.includes("@")) {
    const { data: profile } = await admin.from("profiles").select("id").eq("username", raw.toLowerCase()).maybeSingle();
    if (profile) {
      const { data: u } = await admin.auth.admin.getUserById(profile.id);
      if (u?.user?.email) email = u.user.email;
    }
  }
  // First hop of x-forwarded-for is the real client on Vercel.
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const key = `${email.toLowerCase()}|${ip}`;
  const now = Date.now();

  // Already locked?
  const { data: rec } = await admin.from("login_attempts").select("*").eq("identifier", key).maybeSingle();
  const lockedUntil = rec?.locked_until ? new Date(rec.locked_until).getTime() : 0;
  if (lockedUntil > now) {
    return res.status(429).json({ error: "locked", locked: true, retryAfter: Math.ceil((lockedUntil - now) / 1000) });
  }

  const { data, error } = await anon.auth.signInWithPassword({ email, password });

  if (error) {
    // Don't burn lockout attempts on an unconfirmed-email account.
    if (/confirm/i.test(error.message || "")) {
      return res.status(403).json({ error: "unconfirmed", needsConfirmation: true });
    }
    // A previously expired lock starts a fresh window.
    const priorExpired = lockedUntil > 0 && lockedUntil <= now;
    const fail = (priorExpired ? 0 : rec?.fail_count || 0) + 1;
    const patch = { identifier: key, fail_count: fail, locked_until: null, updated_at: new Date().toISOString() };
    let locked = false;
    if (fail >= MAX_ATTEMPTS) {
      patch.locked_until = new Date(now + LOCK_SECONDS * 1000).toISOString();
      locked = true;
    }
    await admin.from("login_attempts").upsert(patch);
    return res.status(locked ? 429 : 401).json({
      error: "invalid",
      locked,
      retryAfter: locked ? LOCK_SECONDS : 0,
      remaining: Math.max(0, MAX_ATTEMPTS - fail),
    });
  }

  // Success: clear the counter, then claim this device as one of the account's
  // active sessions — up to the plan's device limit (Première classe 2, VIP 4,
  // otherwise 1). Done through the security-definer claim_device_session RPC,
  // called AS the just-authenticated user so auth.uid() resolves inside it: the
  // session id is generated server-side (a client can neither choose nor clear
  // it) and the per-plan limit lives in one place (the migration). When every
  // slot is already held by OTHER devices the RPC refuses; we relay that as
  // deviceLimitReached and withhold the session, so the login is blocked at the
  // device gate rather than silently evicting one of the user's devices.
  await admin.from("login_attempts").delete().eq("identifier", key);

  let deviceSession = null;
  try {
    const authed = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
    const { data: sid, error: claimErr } = await authed.rpc("claim_device_session", { p_current: currentDevice || null });
    if (claimErr) {
      if (String(claimErr.message || "").includes("device_limit_reached")) {
        return res.status(200).json({ deviceLimitReached: true });
      }
      // Any other RPC error (e.g. pre-migration DB): leave the mechanism inert.
    } else {
      deviceSession = sid;
    }
  } catch { /* offline / RPC missing — mechanism stays inert */ }

  return res.status(200).json({
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    deviceSession,
  });
}
