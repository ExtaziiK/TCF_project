-- Track how many questions the user actually answered in each practice quiz,
-- so the dashboard can (a) count a quiz as "completed" only when nothing was
-- skipped and (b) report "questions answered" rather than "questions shown".
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
--
-- Nullable: rows created before this column existed are treated as fully
-- answered (answered = total) by the client.

alter table public.quiz_results add column if not exists answered int;
