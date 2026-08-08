-- Record AI calls that FAILED, not only the ones that worked.
--
-- logAiUsage only ran after a successful Groq call, so a day on which every
-- analysis was rejected showed up in the admin as a QUIET day: few calls, few
-- tokens. Exactly backwards, and the one day you would most want the dashboard
-- to be loud. It happened on 2026-08-07, when Groq's rolling 24-hour token
-- limit was exhausted and the Utilisation tab reported light usage throughout.
--
-- A failure row carries no tokens — none were spent — so the existing token
-- sums stay correct as long as readers filter on error_status is null, which
-- api/_lib/admin/usage.js now does.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

alter table public.ai_usage_log
  -- The upstream HTTP status when the call was refused (429 saturated, 502
  -- unparseable, 401 …). Null means the call succeeded, which is what every
  -- existing row is.
  add column if not exists error_status int;

-- The admin only ever reads failures by recency, and they are the rare case, so
-- a partial index keeps it small.
create index if not exists ai_usage_log_errors_idx
  on public.ai_usage_log (created_at desc)
  where error_status is not null;
