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

export function logAiUsage({ userId, endpoint, kind, model, usage, audioBytes, durationMs, errorStatus = null, errorDetail = null }) {
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
  // error_detail arrived after error_status (20260808_ai_usage_failure_detail).
  // Sent only when there is something to say, and dropped from the retry below
  // if the column isn't there yet: losing the diagnostic sentence is a small
  // cost, losing the whole failure row — the thing that makes a saturated day
  // visible at all — is not.
  const insert = (r) => client().from("ai_usage_log").insert(r);
  const full = errorDetail ? { ...row, error_detail: errorDetail } : row;
  insert(full).then(({ error }) => {
    if (!error) return;
    if (!errorDetail) { console.warn("ai_usage_log:", error.message); return; }
    insert(row).then(({ error: retryError }) => {
      if (retryError) console.warn("ai_usage_log:", retryError.message);
    });
  });
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
export function logAiFailure({ userId, endpoint, kind, model, status, detail, durationMs }) {
  logAiUsage({
    userId, endpoint, kind, model, durationMs,
    errorStatus: Number(status) || 0,
    errorDetail: detail || null,
  });
}
