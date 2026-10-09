-- The context of a failed AI call: who was affected and in what situation, so
-- the admin's "Appels refusés" panel can answer more than "Groq said 400".
--
-- Shape (every key optional): { source: "groq" | "serveur" | "appareil",
-- section, task, mode, plan, freeReturned, shown, audioBytes, durationMs, mime,
-- words, exchange, device, browser, online, stage, code }.
-- See api/_lib/failureContext.js.
--
-- Also used by the new row kind "incident": a problem that never reached Groq
-- (a silent microphone, a dropped connection, a timed-out function, a bug of
-- ours). Those rows have kind = 'incident' and are reported apart from Groq's
-- refusals — see api/_lib/admin/usage.js.
--
-- Safe to run more than once. Until it is applied, rows are still written
-- without the column (logAiUsage falls back a column at a time).

alter table public.ai_usage_log add column if not exists error_context jsonb;
