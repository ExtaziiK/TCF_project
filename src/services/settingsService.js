import { supabase } from "@/services/supabaseClient";

// Admin-editable, publicly-readable site settings (site_settings table + RLS,
// see supabase/migrations/20260721_site_settings.sql). Reads use the anon key
// so logged-out visitors see the content; writes are admin-only by RLS
// (is_admin()), so no service-role endpoint is needed.
//
// The Accueil banner is stored as a small JSON config in the single
// `home_label` row's text value: { text, enabled, opacity, position }.

const HOME_LABEL = "home_label";
export const LABEL_POSITIONS = ["top", "float-top", "float-bottom"];
const DEFAULT = { text: "", enabled: false, opacity: 1, position: "top" };

function normalize(cfg) {
  return {
    text: String(cfg?.text ?? "").slice(0, 1500),
    enabled: !!cfg?.enabled,
    opacity: Math.min(1, Math.max(0.3, Number(cfg?.opacity) || 1)),
    position: LABEL_POSITIONS.includes(cfg?.position) ? cfg.position : "top",
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
