import { supabase } from "@/services/supabaseClient";

// Member-written success stories, moderated by an admin before they reach the
// public landing page (testimonials table + RLS, see
// supabase/migrations/20260729_testimonials.sql). Everything goes through the
// anon/authenticated key: RLS is what separates "anyone may read approved" from
// "only admins may approve", so no service-role endpoint is needed.

export const MAX_BODY = 600;
export const MIN_BODY = 40;

const s = (v, max) => String(v ?? "").trim().slice(0, max);

// Shape used by the UI. `body` is the story text; the column is named `body`
// rather than `text` to avoid shadowing the SQL keyword in policies.
const toItem = (r) => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  origin: r.origin || "",
  level: r.level || "",
  body: r.body,
  status: r.status,
  featured: !!r.featured,
  createdAt: r.created_at,
});

// Public: approved stories for the landing page, featured first then newest.
// A missing table (migration not applied) degrades to an empty list so the
// caller can fall back to the built-in seed copy.
export async function listApprovedTestimonials(limit = 6) {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("status", "approved")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { ok: false, items: [] };
  return { ok: true, items: (data || []).map(toItem) };
}

// Member submission. Always lands as `pending`; RLS rejects anything else, so
// the status is not a caller-supplied value.
export async function submitTestimonial({ name, origin, level, body }) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return { ok: false, error: "Connectez-vous pour partager votre témoignage." };

  const clean = s(body, MAX_BODY);
  if (clean.length < MIN_BODY) return { ok: false, error: `Votre témoignage doit faire au moins ${MIN_BODY} caractères.` };

  const { error } = await supabase.from("testimonials").insert({
    user_id: userId,
    name: s(name, 60) || "Membre",
    origin: s(origin, 80) || null,
    level: s(level, 40) || null,
    body: clean,
    status: "pending",
    featured: false,
  });
  return { ok: !error, error: error?.message };
}

// The signed-in member's own stories, whatever their status (RLS lets an author
// read their own rows so the profile page can show "en attente de validation").
export async function listMyTestimonials() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return { ok: true, items: [] };
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, items: [] };
  return { ok: true, items: (data || []).map(toItem) };
}

/* ── moderation (admin-only by RLS) ─────────────────────────────────────────── */

export async function listAllTestimonials() {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return { ok: false, unavailable: true, items: [] };
  return { ok: true, items: (data || []).map(toItem) };
}

export async function setTestimonialStatus(id, status) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("testimonials")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: auth?.user?.id ?? null })
    .eq("id", id);
  return { ok: !error, error: error?.message };
}

export async function setTestimonialFeatured(id, featured) {
  const { error } = await supabase.from("testimonials").update({ featured }).eq("id", id);
  return { ok: !error, error: error?.message };
}

// Also used by an author withdrawing their own story (RLS allows both).
export async function deleteTestimonial(id) {
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  return { ok: !error, error: error?.message };
}
