import { supabase } from "@/services/supabaseClient";

// ── Active device sessions (up to the plan's device limit) ──────────────────
// Each login claims a fresh random id, stored locally and added to
// profiles.active_session_ids (capped server-side at the plan's limit —
// Première classe 2, VIP 4, everyone else 1). A device whose local id is no
// longer in the set was signed out (evicted by a newer login, signed out by the
// user elsewhere, or reset by an admin) and signs itself out here too (see
// AppProvider's validation + heartbeat). The policy is EVICT-OLDEST
// (20260726): a new login always succeeds and pushes out the account's oldest
// device, so the user is never locked out of their own account. Inert until the
// migration adding the column is applied: the read/write below fail open, so
// pre-migration or offline states never wrongly boot a logged-in user.
const DEVICE_SESSION_KEY = "tcf_device_session";
// When this browser claimed its slot. Compared against
// profiles.sessions_revoked_at so an admin "disconnect" (20260727) can end
// sessions that are already running: a revocation stamped after the claim means
// this session was ended on purpose. Stored separately from the id above so a
// browser that claimed under an older build (id only, no timestamp) keeps its
// session — see checkDeviceSession for how that case is treated.
const DEVICE_SESSION_AT_KEY = "tcf_device_session_at";
const OAUTH_PENDING_KEY = "tcf_oauth_pending_at";
// Only reachable against a DB still on the 20260724 reject policy (i.e. the app
// deployed before the evict-oldest migration was applied). Kept so that window
// degrades to the old, understandable refusal instead of a silent no-op.
export const DEVICE_LIMIT_MSG = "Limite d'appareils atteinte pour votre forfait. Déconnectez-vous sur un autre de vos appareils, puis réessayez.";

export function getDeviceSessionId() {
  try { return localStorage.getItem(DEVICE_SESSION_KEY) || null; } catch { return null; }
}
function getDeviceSessionClaimedAt() {
  try {
    const raw = Number(localStorage.getItem(DEVICE_SESSION_AT_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  } catch { return null; }
}
function setDeviceSessionId(id) {
  try {
    if (id) {
      localStorage.setItem(DEVICE_SESSION_KEY, id);
      localStorage.setItem(DEVICE_SESSION_AT_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(DEVICE_SESSION_KEY);
      localStorage.removeItem(DEVICE_SESSION_AT_KEY);
    }
  } catch { /* storage unavailable */ }
}

// True while a claim is mid-flight, so a concurrent validation check (heartbeat
// / focus) can't read the not-yet-written row and wrongly boot the device that
// is in the middle of logging in.
let claiming = false;

// Claims this browser as one of the account's active sessions via the
// claim_device_session RPC (security definer): the id is generated SERVER-SIDE,
// so a client can never write an arbitrary value — or null — into the set to
// defeat the mechanism (direct column updates are revoked by the 20260714
// migration). The current local id is passed so a re-login on this same browser
// reuses its slot instead of consuming a new one. Returns:
//   { ok: true, sid }        — claimed (id stored locally)
//   { ok: false, limitReached: true } — pre-migration DB still on the reject
//                              policy; the evict-oldest version never raises
//   { ok: false }            — RPC missing / offline: mechanism stays inert
export async function claimDeviceSession(userId, { current } = {}) {
  if (!userId) return { ok: false };
  claiming = true;
  try {
    const { data, error } = await supabase.rpc("claim_device_session", { p_current: current ?? getDeviceSessionId() ?? null });
    if (error) {
      if (String(error.message || "").includes("device_limit_reached")) return { ok: false, limitReached: true };
      return { ok: false }; // RPC missing or offline — mechanism stays inert
    }
    if (!data) return { ok: false };
    setDeviceSessionId(data);
    return { ok: true, sid: data };
  } finally {
    claiming = false;
  }
}

// Whether this browser may keep the account's session, and if not, why —
// the caller shows a different notice for each cause:
//   { ok: true }
//   { ok: false, reason: "evicted" } — the slot is gone: a newer login pushed
//         this device out, or it was signed out elsewhere.
//   { ok: false, reason: "revoked" } — an admin disconnected the account from
//         the Users panel (profiles.sessions_revoked_at, 20260727).
// Fails open on any uncertainty (a claim in flight, no local id yet, missing
// column, network error, null in DB) so a legitimate session is never booted by
// a transient condition.
export async function checkDeviceSession(userId) {
  if (claiming) return { ok: true };
  const local = getDeviceSessionId();
  if (!userId || !local) return { ok: true };
  const { data, error } = await supabase
    .from("profiles")
    .select("active_session_ids, sessions_revoked_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return { ok: true };

  // Revocation is checked FIRST: the admin action clears active_session_ids as
  // well (so the account's slots are free for an immediate re-login), and an
  // empty set fails open — the marker is the only thing left saying "ended".
  const revokedAt = data.sessions_revoked_at ? Date.parse(data.sessions_revoked_at) : NaN;
  if (Number.isFinite(revokedAt)) {
    const claimedAt = getDeviceSessionClaimedAt();
    // No local claim timestamp means this browser claimed under a build that
    // predates the timestamp (it only stored the id). Treat the revocation as
    // applying: the marker is per-account and only set by a deliberate admin
    // action, so honouring it is the intent — and the next login writes a
    // timestamp, so this only ever happens once per device.
    if (claimedAt == null || revokedAt > claimedAt) return { ok: false, reason: "revoked" };
  }

  const list = data.active_session_ids;
  if (list == null || !Array.isArray(list) || list.length === 0) return { ok: true };
  return list.includes(local) ? { ok: true } : { ok: false, reason: "evicted" };
}

// Marks the current user as "seen right now" (profiles.last_seen_at). Called on
// login and on a timer while the app is open, so the admin Users view can show
// live connections. Goes through a security-definer RPC (clients can't write the
// column directly). Fails open: a missing function (pre-migration) or a network
// blip just means this ping is skipped, never an error the user sees.
export async function touchLastSeen() {
  try { await supabase.rpc("touch_last_seen"); } catch { /* presence is best-effort */ }
}

// OAuth logins redirect away before we can act, so we flag the intent (which
// button was clicked — "login" or "register") and read it back on return.
// Timestamped and consumed on the next load so an abandoned sign-in can't linger
// and trigger a spurious claim on a later reload.
export function markOAuthPending(intent = "login") {
  try { localStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({ at: Date.now(), intent })); } catch { /* ignore */ }
}
export function consumeOAuthPending() {
  try {
    const raw = localStorage.getItem(OAUTH_PENDING_KEY);
    localStorage.removeItem(OAUTH_PENDING_KEY);
    if (!raw) return { pending: false, intent: "login" };
    let obj;
    try { obj = JSON.parse(raw); } catch { obj = { at: Number(raw), intent: "login" }; } // legacy value
    return { pending: !!obj.at && Date.now() - obj.at < 5 * 60 * 1000, intent: obj.intent || "login" };
  } catch { return { pending: false, intent: "login" }; }
}

// Read the OAuth-pending flag WITHOUT clearing it, so the app can show a
// "signing in…" splash from the very first render of an OAuth return (before
// the async session resolves), instead of flashing signed-in UI.
export function peekOAuthPending() {
  try {
    const raw = localStorage.getItem(OAUTH_PENDING_KEY);
    if (!raw) return false;
    let obj;
    try { obj = JSON.parse(raw); } catch { obj = { at: Number(raw) }; }
    return !!obj.at && Date.now() - obj.at < 5 * 60 * 1000;
  } catch { return false; }
}

// True when the Supabase user was created during THIS very sign-in (first-ever
// login): a brand-new account has created_at and last_sign_in_at coinciding,
// while a returning user's last_sign_in_at is far newer than created_at. Used on
// the OAuth return to tell a new Google identity apart from an existing one.
export function isNewlyCreatedUser(authUser) {
  if (!authUser) return false;
  const created = Date.parse(authUser.created_at || "");
  if (!Number.isFinite(created)) return false;
  const lastSignIn = Date.parse(authUser.last_sign_in_at || authUser.created_at || "");
  return !Number.isFinite(lastSignIn) || Math.abs(lastSignIn - created) < 10_000; // 10s
}

// Finishes creating a Google-registered account: sets the country (into
// user_metadata, like email signup) and the chosen username (profiles). Called
// from the onboarding step that gates new Google registrations.
export async function completeGoogleProfile({ username, country }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Session expirée. Reconnectez-vous." } };
  if (country) {
    const meta = user.user_metadata || {};
    if (country !== meta.country) {
      const { error } = await supabase.auth.updateUser({ data: { ...meta, country } });
      if (error) return { error };
    }
  }
  if (username) {
    const clean = String(username).trim().toLowerCase();
    const { error } = await supabase.from("profiles").update({ username: clean }).eq("id", user.id);
    if (error?.code === "23505") return { error: { message: "Ce nom d'utilisateur est déjà pris." } };
    if (error) return { error };
  }
  return { error: null };
}

const FIRST_LOGIN_KEY = "tcf_first_login_seen";

function seenFirstLoginIds() {
  try { return new Set(JSON.parse(localStorage.getItem(FIRST_LOGIN_KEY) || "[]")); }
  catch { return new Set(); }
}

// True the first time it's called for a given user id (right after signup's
// auto-login, or on the first manual login if email confirmation was
// required) — every call after that returns false, so only that one very
// first session redirects to the onboarding landing page. Tracked in
// localStorage rather than a profiles column: this is a one-time UX nicety,
// not data that needs to survive a cleared browser or follow the user
// cross-device.
export function consumeFirstLogin(userId) {
  if (!userId) return false;
  const seen = seenFirstLoginIds();
  if (seen.has(userId)) return false;
  seen.add(userId);
  try { localStorage.setItem(FIRST_LOGIN_KEY, JSON.stringify([...seen])); } catch { /* storage unavailable, degrade to always-first */ }
  return true;
}

// Maps a Supabase session to the { name, email, plan, admin } shape the UI expects.
// `admin`/`plan`/`premium_until` read from app_metadata, which users cannot
// self-edit via the client SDK (unlike user_metadata) — set it from the
// Supabase dashboard: Authentication -> Users -> select user -> edit
// "Raw app meta data", e.g.
//   { "role": "admin" }
//   { "plan": "Premium", "premium_until": "2027-01-31" }
export function mapSupabaseUser(session) {
  const authUser = session?.user;
  if (!authUser) return null;
  return {
    id: authUser.id,
    name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email.split("@")[0],
    email: authUser.email,
    country: authUser.user_metadata?.country || null,
    plan: authUser.app_metadata?.plan || "Sans papier",
    planLabel: authUser.app_metadata?.plan_label || null, // tier name (Passeport / Visa / …)
    premiumUntil: authUser.app_metadata?.premium_until || null,
    admin: authUser.app_metadata?.role === "admin",
    owner: authUser.app_metadata?.role === "owner",
    createdAt: authUser.created_at || null,
  };
}

// Loads the authoritative username (from the profiles table) for the current
// user; the session only carries the desired value, which may have been
// deduped at signup.
export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return { username: data?.username || null, createdAt: user.created_at };
}

// Updates the display name (user_metadata.name), preserving other metadata.
export async function updateDisplayName(name) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.auth.updateUser({ data: { ...(user?.user_metadata || {}), name: normalizeName(name) } });
}

// Renames the username in the profiles table. Stored lowercased; the unique
// constraint (23505) surfaces as a friendly "already taken" message.
export async function updateUsername(username) {
  const clean = String(username).trim().toLowerCase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Session expirée. Reconnectez-vous." } };
  const { error } = await supabase.from("profiles").update({ username: clean }).eq("id", user.id);
  if (error?.code === "23505") return { error: { message: "Ce nom d'utilisateur est déjà pris." } };
  return { error };
}

export async function updatePassword(password) {
  return supabase.auth.updateUser({ password });
}

// Redeems the token_hash carried by a password-reset link and opens the short
// recovery session that lets updatePassword() run.
//
// The reset email deliberately does NOT link to Supabase's /auth/v1/verify
// endpoint. Recovery tokens are single-use, and mail providers (Gmail above
// all) fetch every link in an incoming message to scan it — that GET redeems
// the token, so the human's click arrives to an already-spent link and gets
// "otp_expired". Linking to this app instead means a scanner only fetches
// static HTML: the token is spent here, in JavaScript, which scanners do not
// run. See docs/email-templates/README.md.
export async function verifyRecoveryToken(tokenHash) {
  if (!tokenHash) return { error: { message: "Lien incomplet." } };
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  return { session: data?.session || null, error };
}

export async function signUp({ name, username, email, password, country }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: normalizeName(name), username, country }, emailRedirectTo: window.location.origin },
  });
  return { data, error, needsEmailConfirmation: !error && !data.session };
}

// Display name ("Prénom"). Deliberately permissive: the audience writes accents,
// hyphens and apostrophes (Élodie, Jean-Luc, D'Amico), so only the shape is
// enforced — starts with a letter, no digits or punctuation soup, short enough
// to fit the profile header and the avatar initial.
const NAME_RE = /^\p{L}[\p{L}\p{M}'’ .-]{1,39}$/u;
// Collapses inner runs of whitespace so "Jean   Luc" is stored as "Jean Luc".
export const normalizeName = (n) => String(n || "").trim().replace(/\s+/g, " ");
export const isValidName = (n) => NAME_RE.test(normalizeName(n));

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;
export const isValidUsername = (u) => USERNAME_RE.test(String(u || "").trim());

// Best-effort availability check for the registration form. Fails open: the
// signup trigger dedupes server-side anyway, so a check outage never blocks.
export async function isUsernameAvailable(username) {
  const { data, error } = await supabase.rpc("is_username_available", { candidate: username });
  if (error) return true;
  return !!data;
}

// Sign in with a username OR an email. Goes through api/login (username
// resolution + server-enforced lockout), then installs the returned session.
// Returns a normalized result: { ok, user?, locked?, retryAfter?, remaining?,
// needsConfirmation?, message? }.
export async function signIn({ identifier, password }) {
  let res;
  try {
    res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send the current device id so re-login on this browser reuses its slot.
      body: JSON.stringify({ identifier, password, deviceSession: getDeviceSessionId() }),
    });
  } catch {
    return { ok: false, message: "Connexion au serveur impossible. Réessayez." };
  }

  // Local dev (plain `vite`) has no serverless routes: fall back to a direct
  // email sign-in so login still works — without username or lockout.
  if (res.status === 404) {
    if (!String(identifier).includes("@")) {
      return { ok: false, message: "En développement local, connectez-vous avec votre courriel." };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: identifier, password });
    if (error) return { ok: false, message: error.message };
    const user = mapSupabaseUser(data.session);
    const claim = await claimDeviceSession(user?.id);
    if (claim.limitReached) { await supabase.auth.signOut(); return { ok: false, deviceLimitReached: true, message: DEVICE_LIMIT_MSG }; }
    return { ok: true, user };
  }

  const json = await res.json().catch(() => ({}));

  // Authenticated, but every device slot for the plan is already taken.
  if (json.deviceLimitReached) return { ok: false, deviceLimitReached: true, message: DEVICE_LIMIT_MSG };

  if (json.session) {
    const { data, error } = await supabase.auth.setSession(json.session);
    if (error) return { ok: false, message: error.message };
    const user = mapSupabaseUser(data.session);
    // api/login already claimed the device session server-side; just store the
    // id it handed back. Fall back to the RPC claim for a pre-migration server.
    if (json.deviceSession) setDeviceSessionId(json.deviceSession);
    else {
      const claim = await claimDeviceSession(user?.id);
      if (claim.limitReached) { await supabase.auth.signOut(); return { ok: false, deviceLimitReached: true, message: DEVICE_LIMIT_MSG }; }
    }
    return { ok: true, user };
  }
  if (json.locked) {
    const mins = Math.ceil((json.retryAfter || 600) / 60);
    return { ok: false, locked: true, retryAfter: json.retryAfter, message: `Trop de tentatives. Réessayez dans ${mins} min ou réinitialisez votre mot de passe.` };
  }
  if (json.needsConfirmation) {
    return { ok: false, needsConfirmation: true, message: "Confirmez votre adresse courriel avant de vous connecter." };
  }
  return {
    ok: false,
    remaining: json.remaining,
    message: json.remaining > 0
      ? `Identifiant ou mot de passe incorrect. ${json.remaining} tentative${json.remaining > 1 ? "s" : ""} restante${json.remaining > 1 ? "s" : ""}.`
      : "Identifiant ou mot de passe incorrect.",
  };
}

export async function signInWithGoogle(intent = "login") {
  markOAuthPending(intent); // read back on return (see AppProvider), since the redirect leaves this page
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  // Free this device's slot server-side (while the JWT is still valid) so the
  // next login takes the empty slot instead of evicting the account's oldest
  // device. Signing out properly is what keeps other devices connected.
  const sid = getDeviceSessionId();
  if (sid) { try { await supabase.rpc("release_device_session", { p_sid: sid }); } catch { /* best effort */ } }
  setDeviceSessionId(null); // next login re-claims cleanly
  return supabase.auth.signOut();
}

// A Supabase auth error turned into something worth showing a user.
//
// supabase-js does not always produce a usable `.message`: when GoTrue answers
// with a body it can't map (the 500 it returns when the project's SMTP server
// refuses the mail is one), the message ends up as the literal "{}" — which is
// what the reset screen was putting on screen instead of an explanation. Junk
// like that is replaced by `fallback`, and the few failures a user can actually
// act on get their own wording.
export function authErrorMessage(error, fallback = "Une erreur est survenue. Réessayez dans un instant.") {
  const raw = typeof error === "string" ? error : error?.message;
  const text = typeof raw === "string" ? raw.trim() : "";
  const code = error?.code || error?.error_code || "";

  // Carries no information — never show it.
  const useless = !text || text === "{}" || text === "[]" || text === "null"
    || text === "undefined" || text === "[object Object]";

  // The mail could not be handed to the SMTP server. Nothing the user can fix,
  // so say so plainly rather than blaming their address.
  if (code === "unexpected_failure" || /error sending/i.test(text)) {
    return "L'envoi du courriel a échoué. Ce n'est pas lié à votre compte — réessayez dans quelques minutes ou contactez-nous.";
  }
  // Supabase throttles repeat sends; the raw text is English and mentions seconds.
  if (/rate limit|only request this after|too many requests/i.test(text) || code === "over_email_send_rate_limit") {
    return "Trop de demandes en peu de temps. Patientez une minute avant de réessayer.";
  }
  return useless ? fallback : text;
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Forces a new access token from the server, picking up any app_metadata
// change (e.g. plan/role) made server-side since the cached session was
// issued - getSession() alone only returns what's already cached locally.
export async function refreshSession() {
  const { data } = await supabase.auth.refreshSession();
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}
