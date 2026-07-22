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
