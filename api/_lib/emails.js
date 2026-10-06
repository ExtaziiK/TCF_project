import { EMAIL_TEMPLATES, parseEmail, renderEmail } from "./emailTemplates.js";
import { firstNameOf } from "./emailLayout.js";

// Server side of the editable account emails (api/_lib/emailTemplates.js):
// reads the owner's saved copy from site_settings and renders it for one
// account. Returns null when the owner switched that email off — callers then
// skip the send AND whatever "already sent" stamp would have followed, so
// switching it back on still reaches the accounts in its window.

export async function loadEmail(admin, id) {
  const { data } = await admin.from("site_settings").select("value").eq("key", EMAIL_TEMPLATES[id].key).maybeSingle();
  return parseEmail(id, data?.value);
}

// → { subject, html } | null (disabled). `cache` (optional, a Map) lets a loop
// over many accounts read each setting once.
export async function composeEmail(admin, id, user, vars, site, cache) {
  let cfg = cache?.get(id);
  if (!cfg) { cfg = await loadEmail(admin, id); cache?.set(id, cfg); }
  if (!cfg.enabled) return null;
  return renderEmail(id, cfg, { firstName: firstNameOf(user), vars, site });
}
