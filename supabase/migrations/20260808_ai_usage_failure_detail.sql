-- Keep WHY a call was refused, not only that it was.
--
-- 20260808_ai_usage_failures.sql added error_status, which answers "was it
-- refused" and gives a category (429 saturated, 502 upstream, 401 key). It does
-- not answer the question an admin actually asks when the banner lights up:
-- refused for WHICH reason, exactly. Groq says it in the response body —
-- "Rate limit reached for model `openai/gpt-oss-120b` ... try again in 8.52s" —
-- and we were throwing that sentence away after using it to phrase the message
-- shown to the candidate.
--
-- Stored trimmed (the endpoints cap it) because it is a diagnostic, not a log
-- sink: enough to name the exhausted bucket and the wait, not the whole body.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

alter table public.ai_usage_log
  add column if not exists error_detail text;
