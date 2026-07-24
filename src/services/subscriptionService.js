import { supabase } from "@/services/supabaseClient";

// Manual (DZD) subscription requests: a signed-in user pays by CCP / BaridiMob
// transfer, uploads a receipt, and submits a request that the owner reviews in
// the admin "Demandes" inbox. Everything here talks to Supabase directly under
// RLS (see 20260725_dz_payments.sql) — no serverless hop needed. Granting the
// plan on approval goes through the existing admin users endpoint
// (adminService.updateAdminUser), so it isn't duplicated here.

const BUCKET = "receipts";
export const MAX_RECEIPT_BYTES = 20 * 1024 * 1024; // 20 Mo, matches the UI copy
export const ACCEPTED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Uploads the receipt (into the caller's own uid folder, per storage RLS) then
// inserts the request row. Returns { ok, error? }. Receipt is optional — a user
// may instead send it via the WhatsApp group and submit the request as a record.
export async function submitSubscriptionRequest({ plan, planDays, method, amountDzd, reference, notes, receiptFile }) {
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return { ok: false, error: "not-authenticated" };

  let receiptPath = null;
  if (receiptFile) {
    if (receiptFile.size > MAX_RECEIPT_BYTES) return { ok: false, error: "Fichier trop volumineux (max 20 Mo)." };
    const ext = (receiptFile.name?.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    const path = `${u.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, receiptFile, {
      contentType: receiptFile.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) return { ok: false, error: upErr.message };
    receiptPath = path;
  }

  const { error } = await supabase.from("subscription_requests").insert({
    user_id: u.id,
    email: u.email || null,
    name: u.user_metadata?.name || u.user_metadata?.full_name || null,
    plan: String(plan).slice(0, 60),
    plan_days: planDays || null,
    method: method === "baridimob" ? "baridimob" : "ccp",
    amount_dzd: amountDzd ? String(amountDzd).slice(0, 20) : null,
    reference: reference ? String(reference).trim().slice(0, 200) : null,
    notes: notes ? String(notes).trim().slice(0, 2000) : null,
    receipt_path: receiptPath,
  });
  return { ok: !error, error: error?.message };
}

/* --------------------------------- admin ---------------------------------- */

export async function listSubscriptionRequests() {
  const { data, error } = await supabase
    .from("subscription_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { ok: false, unavailable: true, requests: [] };
  return { ok: true, requests: data };
}

// Short-lived signed URL for a receipt so the owner can view/download it.
export async function signReceiptUrl(path, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  return error ? null : data?.signedUrl || null;
}

export async function setRequestStatus(id, status) {
  const { error } = await supabase.from("subscription_requests").update({ status }).eq("id", id);
  return { ok: !error, error: error?.message };
}

export async function deleteSubscriptionRequest(id, receiptPath) {
  if (receiptPath) await supabase.storage.from(BUCKET).remove([receiptPath]).catch(() => {});
  const { error } = await supabase.from("subscription_requests").delete().eq("id", id);
  return { ok: !error, error: error?.message };
}
