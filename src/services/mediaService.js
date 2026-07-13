import { supabase } from "@/services/supabaseClient";
import { getDeviceSessionId } from "@/services/authService";

// Fetches short-lived signed URLs for a quiz's media in one batch, addressed by
// each question's logical coordinates (section / quiz / question / kind). The
// opaque storage names are derived server-side from a secret, so predictable
// public URLs never reach the client (see api/_lib/media.js).
//
// Fails soft: on the local-dev 404 (plain `vite` has no serverless routes), a
// 401, or any network error, it returns {} and the caller keeps whatever URL
// the question already carries — i.e. bundled dev media still works untouched.
//
// `descriptors`: [{ idx, section, quiz, order, image: bool, audio: bool }]
// Returns: { [idx]: { image?: signedUrl, audio?: signedUrl } }
export async function signQuizMedia(descriptors) {
  const items = [];
  for (const d of descriptors) {
    if (d.image) items.push({ ref: String(d.idx), section: d.section, quiz: d.quiz, order: d.order, kind: "image" });
    if (d.audio) items.push({ ref: String(d.idx), section: d.section, quiz: d.quiz, order: d.order, kind: "audio" });
  }
  if (items.length === 0) return {};

  let res;
  try {
    const { data } = await supabase.auth.getSession();
    const headers = { "Content-Type": "application/json" };
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
    const deviceSession = getDeviceSessionId();
    if (deviceSession) headers["x-device-session"] = deviceSession;

    res = await fetch("/api/media", { method: "POST", headers, body: JSON.stringify({ items }) });
  } catch {
    return {};
  }
  if (!res.ok) return {};

  const json = await res.json().catch(() => ({}));
  const urls = json.urls || {};
  const out = {};
  for (const it of items) {
    const url = urls[`${it.ref}:${it.kind}`];
    if (!url) continue;
    (out[it.ref] ||= {})[it.kind] = url;
  }
  return out;
}
