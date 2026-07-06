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

export async function signUp({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: window.location.origin },
  });
  return { data, error, needsEmailConfirmation: !error && !data.session };
}

export async function signIn({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
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

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}
