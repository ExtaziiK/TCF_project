import { supabase } from "@/services/supabaseClient";

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
  };
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
