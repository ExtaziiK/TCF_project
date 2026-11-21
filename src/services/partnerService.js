import { getSupabase } from "@/services/supabaseClient";

// « Devenir partenaire »: the public form sends through the service-role API
// (api/public/partner — rate limit, email to the team), and the admin reads and
// updates partner_applications client-direct through its admin RLS policies
// (supabase/migrations/20261121_partner_applications.sql).

export const PARTNER_STATUSES = [
  { id: "new", label: "Nouveau" },
  { id: "meeting", label: "Rendez-vous" },
  { id: "accepted", label: "Accepté" },
  { id: "declined", label: "Refusé" },
];

// The visitor's application. Signed in, the account is attached; not needed.
// Returns { ok: true } or { ok: false, error } (error in French, shown as is).
export async function submitPartnerApplication(form) {
  const { data } = await (await getSupabase()).auth.getSession();
  const token = data.session?.access_token;
  try {
    const res = await fetch("/api/public/partner", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: json.error };
  } catch {
    return { ok: false, error: null };
  }
}

// A missing table (migration not applied) reads as "unavailable", not as an error.
const missing = (error) => !!error && (error.code === "42P01" || /partner_applications/.test(error.message || ""));

export async function listPartnerApplications() {
  const { data, error } = await (await getSupabase())
    .from("partner_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return { items: [], unavailable: missing(error), error: error.message };
  return { items: data || [] };
}

export async function updatePartnerApplication(id, patch) {
  const { error } = await (await getSupabase()).from("partner_applications").update(patch).eq("id", id);
  return { ok: !error };
}

export async function deletePartnerApplication(id) {
  const { error } = await (await getSupabase()).from("partner_applications").delete().eq("id", id);
  return { ok: !error };
}
