import { requireUser } from "./_lib/auth.js";
import { signMediaBatch } from "./_lib/media.js";
import { HttpError } from "./_lib/groq.js";

// Hands out short-lived signed URLs for a batch of quiz media, addressed by
// logical coordinates (section / quiz / question / kind). Requiring a valid
// session here is the access gate: unauthenticated traffic can't enumerate or
// bulk-download the bank, and a superseded device (single-active-session) is
// refused by requireUser even on a still-valid JWT.
//
// A quiz is at most 39 questions × 2 media kinds; the cap guards against a
// caller asking us to sign the whole library in one request.
const MAX_ITEMS = 120;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    await requireUser(req);

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.status(200).json({ urls: {} });
    if (items.length > MAX_ITEMS) throw new HttpError(400, "Too many items requested.");

    // Whitelist and normalize; anything malformed is dropped rather than trusted.
    const clean = items
      .filter((it) => it && (it.kind === "image" || it.kind === "audio") && it.section && it.quiz != null && it.order != null)
      .map((it) => ({ ref: String(it.ref), section: String(it.section), quiz: it.quiz, order: it.order, kind: it.kind }));

    const urls = await signMediaBatch(clean);
    res.status(200).json({ urls });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Media signing failed." });
  }
}
