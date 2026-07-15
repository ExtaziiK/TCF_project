import { createClient } from "@supabase/supabase-js";

// Fire-and-forget metering of Groq calls into ai_usage_log (service role —
// clients can't fabricate rows). Groq exposes no usage API, so this log is
// the platform's own meter; the admin dashboard aggregates it. Never throws:
// a metering failure (e.g. migration not applied yet) must not break the
// user-facing AI evaluation that just succeeded.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export function logAiUsage({ userId, endpoint, kind, model, usage, audioBytes, durationMs }) {
  admin
    .from("ai_usage_log")
    .insert({
      user_id: userId || null,
      endpoint,
      kind,
      model: model || null,
      prompt_tokens: usage?.prompt_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      audio_bytes: audioBytes ?? null,
      duration_ms: durationMs ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn("ai_usage_log:", error.message);
    });
}
