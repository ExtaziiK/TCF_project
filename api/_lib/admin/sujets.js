import { requireAdmin } from "../auth.js";
import { HttpError, CHAT_MODEL_NAME } from "../groq.js";
import { logAiUsage } from "../usage.js";
import { enforceRateLimit } from "../ratelimit.js";
import { importLatest } from "../sujetsSource.js";

// POST /api/admin/sujets — reads the newest month of subjects published on
// reussir-tcfcanada.com for one épreuve, rewords every string through Groq and
// returns it for review. Backs the "Générer" button in the admin Sujets tab.
//
// This endpoint only PROPOSES: nothing is written here. The admin reviews the
// preview and publishes it, and that write goes through the same
// sujets_archive path (and the same RLS) as a hand-typed month — see
// src/services/sujetsArchiveService.js. Content that becomes public on the
// site should not appear there on a single unreviewed server call.

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await requireAdmin(req);

    const section = req.body?.section;
    if (section !== "ee" && section !== "eo") throw new HttpError(400, "Section invalide (attendu « ee » ou « eo »).");

    // Each run is a handful of billable Groq calls plus two hits on someone
    // else's site. It's a once-a-month action; this only stops a stuck button
    // from looping.
    await enforceRateLimit(req, { name: "sujets-import", limit: 8, windowSeconds: 600, userId: user.id });

    const result = await importLatest(section);
    logAiUsage({
      userId: user.id,
      endpoint: "admin/sujets",
      kind: "chat",
      model: CHAT_MODEL_NAME,
      usage: result.usage,
      durationMs: result.durationMs,
    });

    // usage/durationMs are metering, not content — they stay server-side.
    res.status(200).json({
      section: result.section,
      year: result.year,
      monthNum: result.monthNum,
      month: result.month,
      sourceUrl: result.sourceUrl,
      data: result.data,
      counts: result.counts,
      kept: result.kept,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "L'import des sujets a échoué." });
  }
}
