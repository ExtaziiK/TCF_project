-- question_attempts was only ever read by question (the Sujets analytics ask
-- "how did everyone do on question X"), so its single index is on question_id.
-- The per-user activity panel asks the opposite question — "what has THIS
-- candidate answered" — and without a matching index that is a sequential scan
-- of the largest table on the platform on every panel open.
--
-- Idempotent. Run in the Supabase SQL editor or via `supabase db push`.

create index if not exists question_attempts_user_date_idx
  on public.question_attempts (user_id, created_at desc);
