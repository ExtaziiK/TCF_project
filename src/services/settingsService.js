import { supabase } from "@/services/supabaseClient";
import { HOME_STATS_DEFAULT, STAT_SOURCES } from "@/constants/home";

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

/* ── Home "Statistique" band ────────────────────────────────────────────────
 * { enabled, items: [{ src, n, l }] }. Toggling `enabled` off removes the whole
 * band from the public landing page. A missing/blank row means "nothing saved
 * yet" and degrades to HOME_STATS_DEFAULT, so the band keeps showing the real
 * content counts until an admin customises it. */

const HOME_STATS = "home_stats";
const MAX_STATS = 6;

function normalizeHomeStats(cfg) {
  const items = (Array.isArray(cfg?.items) ? cfg.items : [])
    .map((it) => ({
      src: STAT_SOURCES.includes(it?.src) ? it.src : "manual",
      n: String(it?.n ?? "").slice(0, 24),
      l: String(it?.l ?? "").slice(0, 60),
    }))
    .filter((it) => it.l.trim())
    .slice(0, MAX_STATS);
  return { enabled: cfg?.enabled !== false, items };
}

export async function getHomeStats() {
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", HOME_STATS).maybeSingle();
  if (error || !data?.value) return { ...HOME_STATS_DEFAULT, items: [...HOME_STATS_DEFAULT.items] };
  try {
    const clean = normalizeHomeStats(JSON.parse(data.value));
    // An admin who deleted every row gets the defaults back rather than an
    // empty band that silently renders as a bare strip.
    return clean.items.length ? clean : { ...clean, items: [...HOME_STATS_DEFAULT.items] };
  } catch {
    return { ...HOME_STATS_DEFAULT, items: [...HOME_STATS_DEFAULT.items] };
  }
}

// Admin-only (enforced by RLS). Returns { ok, error? }.
export async function setHomeStats(cfg) {
  const clean = normalizeHomeStats(cfg);
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: HOME_STATS, value: JSON.stringify(clean), updated_at: new Date().toISOString(), updated_by: data?.user?.id ?? null }, { onConflict: "key" });
  return { ok: !error, error: error?.message };
}

/* ── Live student count (home stats "Auto · étudiants inscrits") ─────────── */

// Number of registered learners, staff accounts excluded. Goes through the
// registered_students_count() RPC (supabase/migrations/20260729_student_count.sql)
// because the anon key can read neither auth.users nor other people's profiles
// rows; the function returns the aggregate only. Returns null when the
// migration isn't applied or the call fails, so callers fall back to the last
// saved figure rather than publishing a 0.
export async function getStudentCount() {
  const { data, error } = await supabase.rpc("registered_students_count");
  const n = Number(data);
  return error || !Number.isFinite(n) ? null : n;
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
