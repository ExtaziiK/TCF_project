import { supabase } from "@/services/supabaseClient";
import { getDeviceSessionId } from "@/services/authService";

// Client for the admin dashboard. Two data paths:
// - api/admin/* (service-role serverless routes) for anything that touches
//   auth accounts: platform stats and user management. Fails soft with
//   { unavailable: true } on the local-dev 404 (plain `vite` has no
//   serverless routes) so the dashboard can say so instead of erroring.
// - Supabase directly (admin RLS policies) for contact messages and the
//   audit log — no server hop needed, is_admin() gates the rows.

async function authHeaders() {
  let { data } = await supabase.auth.getSession();
  // Proactively refresh a token that's expired or about to (within 60s), so we
  // never send a stale one — the server rejects it as "Invalid or expired
  // session" (e.g. after the tab has been idle a while).
  const exp = data?.session?.expires_at; // unix seconds
  if (data?.session && exp && exp * 1000 - Date.now() < 60_000) {
    const r = await supabase.auth.refreshSession();
    if (r.data?.session) data = r.data;
  }
  const headers = { "Content-Type": "application/json" };
  const token = data?.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  const deviceSession = getDeviceSessionId();
  if (deviceSession) headers["x-device-session"] = deviceSession;
  return headers;
}

async function adminFetch(path, options = {}) {
  const send = async () => fetch(path, { ...options, headers: await authHeaders() });
  let res;
  try {
    res = await send();
    // A 401 mid-session almost always means the access token just expired.
    // Force a refresh and retry once before surfacing the error.
    if (res.status === 401) {
      await supabase.auth.refreshSession().catch(() => {});
      res = await send();
    }
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
  if (res.status === 404) return { ok: false, unavailable: true };
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error || `Erreur ${res.status}` };
  return { ok: true, data: json };
}

/* ------------------------------ stats & users ----------------------------- */

export function fetchAdminStats() {
  return adminFetch("/api/admin/stats");
}

// AI (Groq) metering + Supabase consumption for the "Utilisation" tab.
export function fetchAdminUsage() {
  return adminFetch("/api/admin/usage");
}

export function listAdminUsers({ search = "", page = 1 } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return adminFetch(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

// action: "set-plan" { plan, months } | "set-role" { role } | "delete"
export function updateAdminUser(payload) {
  return adminFetch("/api/admin/users", { method: "POST", body: JSON.stringify(payload) });
}

/* ------------------------------- promo codes ------------------------------ */

export function listPromoCodes() {
  return adminFetch("/api/admin/promo");
}

// { code, percentOff | amountOff, duration, durationInMonths?, maxRedemptions?, expiresAt? }
export function createPromoCode(payload) {
  return adminFetch("/api/admin/promo", { method: "POST", body: JSON.stringify({ action: "create", ...payload }) });
}

export function togglePromoCode(id, active) {
  return adminFetch("/api/admin/promo", { method: "POST", body: JSON.stringify({ action: "toggle", id, active }) });
}

/* ---------------------------- contact messages ---------------------------- */

// Public form submission (Contact page) — RLS allows anyone to insert.
export async function submitContactMessage({ name, email, subject, message, userId }) {
  const { error } = await supabase.from("contact_messages").insert({
    user_id: userId || null,
    name: String(name).trim().slice(0, 120),
    email: String(email).trim().slice(0, 200),
    subject: String(subject || "").trim().slice(0, 200) || null,
    message: String(message).trim().slice(0, 4000),
  });
  return { ok: !error, error: error?.message };
}

export async function listContactMessages() {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { ok: false, unavailable: true, messages: [] };
  return { ok: true, messages: data };
}

export async function setMessageStatus(id, status) {
  const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
  return { ok: !error };
}

export async function deleteMessage(id) {
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  return { ok: !error };
}

/* -------------------------------- audit log ------------------------------- */

export async function listAuditLog(limit = 100) {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { ok: false, unavailable: true, entries: [] };
  return { ok: true, entries: data };
}
