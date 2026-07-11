import { supabase } from "@/services/supabaseClient";

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
    plan: authUser.app_metadata?.plan || "Découverte",
    premiumUntil: authUser.app_metadata?.premium_until || null,
    admin: authUser.app_metadata?.role === "admin",
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
  return supabase.auth.updateUser({ data: { ...(user?.user_metadata || {}), name: name.trim() } });
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

export async function signUp({ name, username, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, username }, emailRedirectTo: window.location.origin },
  });
  return { data, error, needsEmailConfirmation: !error && !data.session };
}

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
      body: JSON.stringify({ identifier, password }),
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
    return { ok: true, user: mapSupabaseUser(data.session) };
  }

  const json = await res.json().catch(() => ({}));

  if (json.session) {
    const { data, error } = await supabase.auth.setSession(json.session);
    if (error) return { ok: false, message: error.message };
    return { ok: true, user: mapSupabaseUser(data.session) };
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

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
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
