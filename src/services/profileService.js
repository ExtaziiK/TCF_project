import { supabase } from "@/services/supabaseClient";

// Profiles inside one account: several candidates share a Première classe or
// VIP pass, each keeping their own progression (see
// supabase/migrations/20260804_learner_profiles.sql).
//
// The PIN is a courtesy lock, not a security boundary, and the code should not
// imply otherwise. Every profile sits under ONE Supabase account and one JWT,
// so RLS cannot separate them, and whoever is choosing already has the account
// password. It stops a sibling opening the wrong profile. That is all.
//
// The per-plan cap is enforced by the insert policy, not here — the client
// writes these rows with the anon key, so a hidden button would stop nobody.

export const PROFILE_ACCENTS = 6; // palette size the chooser draws from
export const PIN_LENGTH = 4;

const toProfile = (r) => ({
  id: r.id,
  name: r.name,
  accent: r.accent ?? 0,
  locked: !!r.pin_hash,
  createdAt: r.created_at,
});

// Salted with the profile id so the same PIN on two profiles does not produce
// the same hash. SHA-256 keeps it out of the table in plain text; it is not a
// slow hash because it is not defending anything a determined account holder
// could not already reach.
async function hashPin(profileId, pin) {
  const data = new window.TextEncoder().encode(`${profileId}:${pin}`);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const cleanPin = (pin) => String(pin ?? "").replace(/\D/g, "").slice(0, PIN_LENGTH);
const cleanName = (name) => String(name ?? "").trim().slice(0, 30);

export async function listProfiles() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return { ok: true, items: [] };
  const { data, error } = await supabase
    .from("learner_profiles")
    .select("id, name, accent, pin_hash, created_at")
    .eq("user_id", userId)
    .order("created_at");
  // A missing table (migration not applied) must not lock anyone out: the
  // caller treats an empty list as "no profiles feature" and carries on.
  if (error) return { ok: false, items: [] };
  return { ok: true, items: (data || []).map(toProfile) };
}

export async function createProfile({ name, accent = 0, pin }) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return { ok: false, error: "Connectez-vous pour créer un profil." };

  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Donnez un nom à ce profil." };

  // The row is inserted first so its id can salt the PIN hash, then updated.
  const { data, error } = await supabase
    .from("learner_profiles")
    .insert({ user_id: userId, name: clean, accent: Number(accent) || 0 })
    .select("id, name, accent, pin_hash, created_at")
    .single();
  if (error) {
    // 23505 = the (user_id, name) unique index; 42501 = the insert policy
    // refusing because the plan's profile cap is reached.
    if (error.code === "23505") return { ok: false, error: "Vous avez déjà un profil portant ce nom." };
    if (error.code === "42501") return { ok: false, error: "Votre forfait n'autorise pas de profil supplémentaire." };
    return { ok: false, error: error.message };
  }

  const digits = cleanPin(pin);
  if (digits.length === PIN_LENGTH) {
    await supabase.from("learner_profiles").update({ pin_hash: await hashPin(data.id, digits) }).eq("id", data.id);
    return { ok: true, profile: { ...toProfile(data), locked: true } };
  }
  return { ok: true, profile: toProfile(data) };
}

export async function renameProfile(id, name) {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Donnez un nom à ce profil." };
  const { error } = await supabase.from("learner_profiles").update({ name: clean }).eq("id", id);
  if (error?.code === "23505") return { ok: false, error: "Vous avez déjà un profil portant ce nom." };
  return { ok: !error, error: error?.message };
}

// `pin` empty removes the lock; four digits set or replace it.
export async function setProfilePin(id, pin) {
  const digits = cleanPin(pin);
  if (digits && digits.length !== PIN_LENGTH) {
    return { ok: false, error: `Le code doit faire ${PIN_LENGTH} chiffres.` };
  }
  const pin_hash = digits ? await hashPin(id, digits) : null;
  const { error } = await supabase.from("learner_profiles").update({ pin_hash }).eq("id", id);
  return { ok: !error, error: error?.message };
}

// Deleting a profile takes its exam attempts and quiz results with it — that is
// what the ON DELETE CASCADE in the migration is for, and what "separate
// progression" has to mean when someone is removed from the account.
export async function deleteProfile(id) {
  const { error } = await supabase.from("learner_profiles").delete().eq("id", id);
  return { ok: !error, error: error?.message };
}

// Compares against the stored hash. Read back rather than trusted from the
// cached list so a PIN changed on another device is honoured here.
export async function verifyPin(id, pin) {
  const digits = cleanPin(pin);
  if (digits.length !== PIN_LENGTH) return false;
  const { data, error } = await supabase
    .from("learner_profiles")
    .select("pin_hash")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.pin_hash) return false;
  return data.pin_hash === (await hashPin(id, digits));
}

/* ── which profile this device is using ─────────────────────────────────────
 * Per account, so two accounts on one browser do not inherit each other's
 * choice, and per device rather than server-side: it is a convenience, and
 * storing it would mean a phone changing what a laptop shows.
 */
const KEY = (userId) => `tcf_profile_${userId}`;

export function readActiveProfileId(userId) {
  if (!userId) return null;
  try { return localStorage.getItem(KEY(userId)); } catch { return null; }
}
export function writeActiveProfileId(userId, id) {
  if (!userId) return;
  try {
    if (id) localStorage.setItem(KEY(userId), id);
    else localStorage.removeItem(KEY(userId));
  } catch { /* storage unavailable — the chooser just reappears next visit */ }
}
