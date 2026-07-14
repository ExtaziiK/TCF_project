import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

  const { identifier, password } = req.body || {};
  if (!identifier || !password) return res.status(400).json({ error: "missing", message: "Identifiant et mot de passe requis." });

  const raw = String(identifier).trim();

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

  // Success: clear the counter, claim this device as the account's single
  // active session (the id is generated HERE, with the service role — clients
  // can no longer write active_session_id directly, see the 20260714
  // migration), and hand both to the client.
  await admin.from("login_attempts").delete().eq("identifier", key);
  let deviceSession = randomUUID();
  const { error: claimErr } = await admin
    .from("profiles")
    .update({ active_session_id: deviceSession })
    .eq("id", data.user.id);
  if (claimErr) deviceSession = null; // column missing (pre-migration): feature stays inert
  return res.status(200).json({
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    deviceSession,
  });
}
