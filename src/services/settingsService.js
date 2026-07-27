import { supabase } from "@/services/supabaseClient";

// Admin-editable, publicly-readable site settings (site_settings table + RLS,
// see supabase/migrations/20260721_site_settings.sql). Reads use the anon key
// so logged-out visitors see the content; writes are admin-only by RLS
// (is_admin()), so no service-role endpoint is needed.
//
// The Accueil banner is stored as a small JSON config in the single
// `home_label` row's text value: { text, enabled, opacity, position }.

const HOME_LABEL = "home_label";
// The four page corners the banner can be pinned to.
export const LABEL_POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const DEFAULT = { text: "", enabled: false, opacity: 1, position: "bottom-right" };

function normalize(cfg) {
  // Migrate any legacy position value to a corner.
  const legacy = { top: "top-left", "float-top": "top-right", "float-bottom": "bottom-right" };
  const pos = legacy[cfg?.position] || cfg?.position;
  return {
    text: String(cfg?.text ?? "").slice(0, 1500),
    enabled: !!cfg?.enabled,
    opacity: Math.min(1, Math.max(0.3, Number(cfg?.opacity) || 1)),
    position: LABEL_POSITIONS.includes(pos) ? pos : "bottom-right",
  };
}

// Returns the banner config. "" / read error (e.g. migration not applied) /
// legacy plain-string value all degrade to a sensible object.
export async function getHomeLabel() {
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", HOME_LABEL).maybeSingle();
  if (error || !data?.value) return { ...DEFAULT };
  try {
    const parsed = JSON.parse(data.value);
    if (parsed && typeof parsed === "object") return normalize(parsed);
  } catch { /* legacy plain string below */ }
  const text = String(data.value);
  return normalize({ text, enabled: !!text.trim() });
}

// Admin-only (enforced by RLS). Persists the config as JSON. Returns { ok, error? }.
export async function setHomeLabel(cfg) {
  const clean = normalize(cfg);
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: HOME_LABEL, value: JSON.stringify(clean), updated_at: new Date().toISOString(), updated_by: data?.user?.id ?? null }, { onConflict: "key" });
  return { ok: !error, error: error?.message };
}

/* ── Top announcement bar (marquee) ─────────────────────────────────────── */

const ANNOUNCE_BAR = "announcement_bar";
// Keep the JSON well under the 2000-char column limit.
const MAX_MSGS = 12;
const MAX_MSG_LEN = 120;

// { enabled, messages }. `messages: null` means "use the built-in defaults"
// (nothing has been customized yet) — read errors degrade to that too, so the
// bar keeps showing its static list until an admin changes it.
export async function getAnnouncementBar() {
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", ANNOUNCE_BAR).maybeSingle();
  if (error || !data?.value) return { enabled: true, messages: null };
  try {
    const p = JSON.parse(data.value);
    const messages = Array.isArray(p?.messages) ? p.messages.filter((m) => typeof m === "string") : null;
    return { enabled: p?.enabled !== false, messages: messages && messages.length ? messages : null };
  } catch { return { enabled: true, messages: null }; }
}

// Admin-only (enforced by RLS). Returns { ok, error? }.
export async function setAnnouncementBar(cfg) {
  const clean = {
    enabled: cfg?.enabled !== false,
    messages: (Array.isArray(cfg?.messages) ? cfg.messages : []).map((m) => String(m).slice(0, MAX_MSG_LEN)).filter((m) => m.trim()).slice(0, MAX_MSGS),
  };
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: ANNOUNCE_BAR, value: JSON.stringify(clean), updated_at: new Date().toISOString(), updated_by: data?.user?.id ?? null }, { onConflict: "key" });
  return { ok: !error, error: error?.message };
}

/* ── DZD (Algeria) manual-payment config ────────────────────────────────────
 * Bank-transfer account details + per-plan DZD prices, edited by the owner in
 * the admin "Tarifs" tab and read publicly by the DZD checkout page. Prices are
 * kept as strings (e.g. "2600") keyed by plan display name; an empty string
 * means "no override — fall back to the auto-converted amount". */

const PAYMENT_DZ = "payment_dz";
const s = (v, max = 200) => String(v ?? "").trim().slice(0, max);

const DEFAULT_PAYMENT_DZ = {
  ccp: { number: "", key: "", holder: "" },
  baridimob: { rip: "", holder: "" },
  whatsappGroupUrl: "",
  prices: {}, // { [planName]: "2600" }
};

function normalizePaymentDz(cfg) {
  const c = cfg && typeof cfg === "object" ? cfg : {};
  const prices = {};
  if (c.prices && typeof c.prices === "object") {
    for (const [k, v] of Object.entries(c.prices)) prices[s(k, 60)] = s(v, 20);
  }
  return {
    ccp: { number: s(c.ccp?.number), key: s(c.ccp?.key, 40), holder: s(c.ccp?.holder) },
    baridimob: { rip: s(c.baridimob?.rip, 40), holder: s(c.baridimob?.holder) },
    whatsappGroupUrl: s(c.whatsappGroupUrl, 400),
    prices,
  };
}

// Publicly readable so the checkout page can show the account details. Degrades
// to empty defaults if the migration isn't applied or the row is blank.
export async function getPaymentDz() {
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", PAYMENT_DZ).maybeSingle();
  if (error || !data?.value) return { ...DEFAULT_PAYMENT_DZ };
  try {
    return normalizePaymentDz(JSON.parse(data.value));
  } catch {
    return { ...DEFAULT_PAYMENT_DZ };
  }
}

// Admin-only (enforced by RLS). Returns { ok, error? }.
export async function setPaymentDz(cfg) {
  const clean = normalizePaymentDz(cfg);
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: PAYMENT_DZ, value: JSON.stringify(clean), updated_at: new Date().toISOString(), updated_by: data?.user?.id ?? null }, { onConflict: "key" });
  return { ok: !error, error: error?.message };
}

/* ── Pricing launch promotion ───────────────────────────────────────────────
 * The site-wide "launch offer" shown on the Tarifs page: a struck-through
 * "before" price and a "−N %" badge on every paid plan. It's a DISPLAY promo —
 * the amount actually charged is the plan's Stripe price; the percentage only
 * drives the crossed-out figure and the badge. Owner-controlled, publicly read.
 * Defaults keep the historical −50 % launch offer until the owner changes it. */

const PRICING_PROMO = "pricing_promo";
export const DEFAULT_PROMO = { enabled: true, percent: 50, badge: "", headline: "", endsAt: "" };

function normalizePromo(cfg) {
  const c = cfg && typeof cfg === "object" ? cfg : {};
  return {
    enabled: c.enabled !== false,
    percent: Math.min(90, Math.max(0, Math.round(Number(c.percent)) || 0)),
    badge: s(c.badge, 24),
    headline: s(c.headline, 160),
    endsAt: s(c.endsAt, 40),
  };
}

// True when the launch promo should be shown: enabled, has a percentage, and
// (if an end date is set) not yet past.
export function promoActive(cfg) {
  if (!cfg?.enabled || !(cfg.percent > 0)) return false;
  if (cfg.endsAt) { const t = Date.parse(cfg.endsAt); if (Number.isFinite(t) && t < Date.now()) return false; }
  return true;
}

// Publicly readable so the Tarifs page can render the promo. Degrades to the
// default launch offer if the migration/row is missing.
export async function getPricingPromo() {
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", PRICING_PROMO).maybeSingle();
  if (error || !data?.value) return { ...DEFAULT_PROMO };
  try { return normalizePromo(JSON.parse(data.value)); } catch { return { ...DEFAULT_PROMO }; }
}

// Admin-only (enforced by RLS). Returns { ok, error? }.
export async function setPricingPromo(cfg) {
  const clean = normalizePromo(cfg);
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: PRICING_PROMO, value: JSON.stringify(clean), updated_at: new Date().toISOString(), updated_by: data?.user?.id ?? null }, { onConflict: "key" });
  return { ok: !error, error: error?.message };
}
