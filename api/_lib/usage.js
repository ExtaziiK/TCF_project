import { createClient } from "@supabase/supabase-js";

// Fire-and-forget metering of Groq calls into ai_usage_log (service role —
// clients can't fabricate rows). Groq exposes no usage API, so this log is
// the platform's own meter; the admin dashboard aggregates it. Never throws:
// a metering failure (e.g. migration not applied yet) must not break the
// user-facing AI evaluation that just succeeded.

// Built on first use, not at import. Creating it eagerly made this module
// impossible to import without Supabase credentials, which quietly forced that
// requirement on everything that meters — including the subjects parser, whose
// tests have no database and need none. Metering must never dictate what its
// callers depend on.
let admin = null;
function client() {
  if (!admin) {
    admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return admin;
}

// The row variants to try, most complete first, so a migration that hasn't
// landed yet degrades one column at a time instead of losing the row.
// error_detail and error_request arrived in separate migrations after
// error_status (20260808_ai_usage_failure_detail.sql and
// 20260808_ai_usage_request_snapshot.sql), so a deploy can land ahead of
// either: losing a diagnostic column is a small cost, losing the whole
// failure row — the thing that makes a saturated day visible at all — is not.
//
// Exported for testing: this ordering is exactly what decides whether a
// pre-migration deploy still gets error_detail (it should) when only
// error_request's migration is missing.
export function buildInsertAttempts(row, { errorDetail, errorRequest } = {}) {
  const attempts = [row];
  if (errorDetail) attempts.unshift({ ...attempts[0], error_detail: errorDetail });
  if (errorRequest) attempts.unshift({ ...attempts[0], error_request: errorRequest });
  return attempts;
}

export function logAiUsage({ userId, endpoint, kind, model, usage, audioBytes, durationMs, errorStatus = null, errorDetail = null, errorRequest = null }) {
  const row = {
    user_id: userId || null,
    endpoint,
    kind,
    model: model || null,
    error_status: errorStatus,
    prompt_tokens: usage?.prompt_tokens ?? null,
    completion_tokens: usage?.completion_tokens ?? null,
    total_tokens: usage?.total_tokens ?? null,
    audio_bytes: audioBytes ?? null,
    duration_ms: durationMs ?? null,
  };
  const attempts = buildInsertAttempts(row, { errorDetail, errorRequest });

  const insert = (r) => client().from("ai_usage_log").insert(r);
  const tryInsert = (i) => insert(attempts[i]).then(({ error }) => {
    if (!error) return;
    if (i + 1 < attempts.length) return tryInsert(i + 1);
    console.warn("ai_usage_log:", error.message);
  });
  tryInsert(0);
}

// A call that never produced anything. Logged with the upstream status, the
// reason Groq gave, and no tokens — because none were spent.
//
// Without this a saturated day reads as a QUIET one in the admin — few calls,
// few tokens — which is the opposite of the truth and precisely when the
// dashboard should be shouting. Same fire-and-forget contract: metering must
// never turn a failed evaluation into a second failure.
//
// `userId` is what makes a refusal attributable to a candidate. It can be null
// when the request failed BEFORE authentication resolved; the admin then shows
// the row as unattributed rather than guessing.
//
// `request` is the exact payload groq.js sent on the attempt that got refused
// (messages included for chat, metadata only for transcription — see
// groqChatJSON/groqTranscribe) — a full recording of what was sent, next to
// `detail`, what Groq said back. Together they let a refusal be diagnosed, or
// reproduced, without guessing at what the call must have looked like.
export function logAiFailure({ userId, endpoint, kind, model, status, detail, request, durationMs }) {
  logAiUsage({
    userId, endpoint, kind, model, durationMs,
    errorStatus: Number(status) || 0,
    errorDetail: detail || null,
    errorRequest: request || null,
  });
}
