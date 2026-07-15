-- Per-question analytics events. Each row is one student encountering one
-- question in practice: whether they answered, whether it was correct, and
-- roughly how long they spent. Aggregated per question by the admin QMS
-- (attempts, success rate, skip rate, avg time, derived difficulty).
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.

create table if not exists public.question_attempts (
  id bigint generated always as identity primary key,
  question_id text not null,               -- bank/admin question id (not a FK: bank ids are file-derived)
  user_id uuid references auth.users (id) on delete set null,
  answered boolean not null default true,  -- false = the question was skipped
  is_correct boolean,                      -- null when skipped
  duration_ms int,                         -- approximate time spent on the question
  created_at timestamptz not null default now()
);

create index if not exists question_attempts_qid_idx on public.question_attempts (question_id);

alter table public.question_attempts enable row level security;

-- Signed-in users may log their own attempts (anonymous visitors never reach
-- the quiz engine — practice routes require an account — and an open policy
-- would let anyone spam rows or attribute attempts to another user's id).
-- Only admins can read them for analytics.
drop policy if exists "attempts: insert own" on public.question_attempts;
create policy "attempts: insert own" on public.question_attempts
  for insert with check (
    auth.uid() is not null
    and (user_id is null or user_id = auth.uid())
  );
drop policy if exists "attempts: admin read" on public.question_attempts;
create policy "attempts: admin read" on public.question_attempts
  for select using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  );
