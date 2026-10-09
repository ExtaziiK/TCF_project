import { requireUser, isPremiumUser } from "./auth.js";
import { enforceRateLimit } from "./ratelimit.js";
import { logIncident, logAiFailure } from "./usage.js";
import { describeDevice } from "./device.js";

// The situation around a failed AI call, stored beside it in
// ai_usage_log.error_context so the admin can answer, for each row: which
// candidate, on which plan, which tâche, on what phone and browser, what they
// were told, and whether their free analysis was handed back.

const clip = (v, n = 300) => (v == null ? undefined : String(v).slice(0, n));
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : undefined);

function planOf(user) {
  if (!user) return undefined;
  if (!isPremiumUser(user)) return "gratuit";
  return user.app_metadata?.plan_label || "Premium";
}

// What an endpoint knows about the request that just failed. `extra` carries
// what only the endpoint knows (audio size, word count, the message it sent
// back, whether the free use was returned).
export function serverContext(req, user, section, extra = {}) {
  const body = req.body || {};
  const mode = body.attemptId ? "TCF blanc" : body.mode === "dialogue" ? "entretien" : "atelier";
  return {
    section,
    task: num(body.task),
    mode,
    plan: planOf(user),
    ...describeDevice(req.headers?.["user-agent"]),
    ...extra,
  };
}

// `{ action: "client-error" }` on /api/expression-ecrite and
// /api/expression-orale: the candidate's browser reporting a failure the
// server never saw — the connection dropped, the function timed out and the
// gateway answered instead, the microphone produced nothing. Without this
// those candidates are invisible: no row, no email, nothing in the admin.
//
// Folded into the two existing endpoints (the Hobby plan's twelve functions
// are all in use). Signed-in only and rate-limited, so it cannot be used to
// flood the log; every field is clipped, so it cannot be used to fill it.
export async function handleClientError(req, res, section) {
  try {
    const user = await requireUser(req);
    await enforceRateLimit(req, { name: "client-error", limit: 20, windowSeconds: 300, userId: user.id });
    const b = req.body || {};
    const base = serverContext(req, user, section);
    await logIncident({
      userId: user.id,
      // The interview's gradings are logged under "-dialogue"; matching it is
      // what lets the admin see "analyse obtenue après" for this incident.
      endpoint: section === "eo" ? (b.mode === "entretien" ? "expression-orale-dialogue" : "expression-orale") : "expression-ecrite",
      status: num(b.status) || 0,
      detail: clip(b.message, 1000),
      context: {
        source: "appareil",
        ...base,
        mode: clip(b.mode, 40) || base.mode,
        stage: clip(b.stage, 40),
        code: clip(b.code, 60),
        shown: clip(b.shown),
        audioBytes: num(b.audioBytes),
        durationMs: num(b.durationMs),
        mime: clip(b.mime, 80),
        words: num(b.words),
        online: typeof b.online === "boolean" ? b.online : undefined,
        page: clip(b.page, 80),
      },
    });
    return res.status(204).end();
  } catch (err) {
    // Reporting must never become a second error in front of the candidate.
    return res.status(err.status || 500).json({ error: err.message || "report failed" });
  }
}

// One failed request, recorded in the right place — the shared tail of both
// expression endpoints' catch blocks:
//   - Groq refused or failed (err.upstreamStatus, set only by groq.js): a
//     Groq refusal row, as before, now with its context;
//   - something of OURS failed (a 5xx, an exception, a recording too large or
//     unreadable): an incident, source "serveur" — before this, those left no
//     trace at all;
//   - the endpoint's own deliberate refusals (session, plan limits, pacing,
//     an empty text) are not failures and are not logged.
// Awaited by the caller: the function may be frozen once it has answered.
export async function recordFailure(req, user, err, { section, endpoint, kind, model, claim, extra = {} }) {
  const context = serverContext(req, user, section, {
    ...extra,
    returned: clip(err.message),
    // The use is handed back right after this (releaseAiUse in the caller).
    freeReturned: claim && !claim.paid ? true : undefined,
  });
  if (typeof err.upstreamStatus === "number") {
    return logAiFailure({
      userId: user?.id, endpoint, kind, model,
      status: err.upstreamStatus, detail: err.upstreamDetail, request: err.requestPayload, context,
    });
  }
  const status = err.status || 500;
  if (status >= 500 || status === 413 || (section === "eo" && status === 400)) {
    return logIncident({
      userId: user?.id, endpoint, status,
      detail: err.status ? err.message : `${err.name || "Error"}: ${err.message}\n${String(err.stack || "").split("\n").slice(1, 4).join("\n")}`,
      context: { source: "serveur", ...context },
    });
  }
  return undefined;
}
