import { requireUser, isPremiumUser } from "./_lib/auth.js";
import { signMediaBatch } from "./_lib/media.js";
import { HttpError } from "./_lib/groq.js";

// Hands out short-lived signed URLs for a batch of quiz media, addressed by
// logical coordinates (section / quiz / question / kind). Access tiers:
//   - Premium/admin: any quiz.
//   - Everyone else — free accounts, AND anonymous visitors: quiz 1 only, the
//     free teaser (same one BankExplorer leaves unlocked, and what the public
//     home-page CO demo needs). A superseded device (single-active-session)
//     degrades to this tier rather than erroring, which is fine — quiz 1 is
//     public — so the gate still stops bulk-download of the premium bank.
//
// A quiz is at most 39 questions × 2 media kinds; the cap guards against a
// caller asking us to sign the whole library in one request.
const MAX_ITEMS = 120;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    // Optional: a valid session unlocks its tier; anything else (no token,
    // expired, superseded device) falls through to the quiz-1-only tier below.
    let user = null;
    try { user = await requireUser(req); } catch { user = null; }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.status(200).json({ urls: {} });
    if (items.length > MAX_ITEMS) throw new HttpError(400, "Too many items requested.");

    // Whitelist and normalize; anything malformed is dropped rather than trusted.
    let clean = items
      .filter((it) => it && (it.kind === "image" || it.kind === "audio") && it.section && it.quiz != null && it.order != null)
      .map((it) => ({ ref: String(it.ref), section: String(it.section), quiz: it.quiz, order: it.order, kind: it.kind }));

    // Non-premium (free or anonymous) may only sign quiz 1. Enforced here, not
    // just in the UI, so nobody can bulk-download the premium bank by calling
    // this endpoint directly with arbitrary coordinates.
    if (!isPremiumUser(user)) clean = clean.filter((it) => Number(it.quiz) === 1);

    const urls = await signMediaBatch(clean);
    res.status(200).json({ urls });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Media signing failed." });
  }
}
