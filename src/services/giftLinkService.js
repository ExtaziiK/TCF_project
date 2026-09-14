import { supabase } from "@/services/supabaseClient";

// Client side of "gift links" — shareable URLs (?gift=CODE) an admin creates
// in Admin → Tarifs → Liens cadeaux to grant a plan for free, capped at N
// accounts. See api/_lib/public/gift.js for the server side and
// src/hooks/useGiftRedemption.js for how a stashed code turns into a grant
// once the visitor has an account.

const PENDING_KEY = "passerelle.pendingGift";

// The code from a `?gift=` link, kept until it is redeemed (or given up on).
// A fresh visitor has no account yet, so nothing server-side can remember it
// between the landing page and the moment they finish signing up.
export function stashPendingGiftCode(code) {
  try { localStorage.setItem(PENDING_KEY, code); } catch { /* storage unavailable */ }
}
export function pendingGiftCode() {
  try { return localStorage.getItem(PENDING_KEY) || null; } catch { return null; }
}
export function clearPendingGiftCode() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* storage unavailable */ }
}

// Checks a gift code (api/public/gift, GET) so the landing page can preview
// what it grants before anyone has an account. Fails closed: network errors
// or the local-dev 404 read as "not valid" — same posture as
// validatePromoCode in stripeService.js.
export async function validateGiftCode(code) {
  try {
    const res = await fetch(`/api/public/gift?code=${encodeURIComponent(code)}`);
    const isJson = (res.headers.get("content-type") || "").includes("json");
    if (res.status === 404 || !isJson) return { valid: false, unavailable: true };
    const json = await res.json().catch(() => ({}));
    return res.ok && json.valid ? json : { valid: false };
  } catch {
    return { valid: false };
  }
}

// Redeems a gift code onto the SIGNED-IN account (api/public/gift, POST).
// Returns { ok: true, planLabel, premiumUntil } or { ok: false, error }.
export async function redeemGiftCode(code) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "not-authenticated" };
  try {
    const res = await fetch("/api/public/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, ...json } : { ok: false, error: json.error };
  } catch {
    return { ok: false, error: "network" };
  }
}
