-- Standalone practice-quiz results (BankExplorer / Practice / Reading /
-- Listening demo quizzes - anything NOT part of a mock exam, which already
-- has its own storage in exam_attempts/exam_attempt_tasks). Append-only log,
-- so both a per-quiz "best score" and dashboard stats (exercises completed,
-- study time, streak) can be derived from real data instead of localStorage.
-- Run this in the Supabase dashboard (SQL Editor) or via `supabase db push`.

create table if not exists public.quiz_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_key text not null,     -- Quiz component's storageKey, e.g. "bank-co-Quiz_1_CO.json"
  section text,               -- co | ce | ee | eo, when derivable from quiz_key
  ok int not null,
  total int not null,
  pct int not null,
  duration_sec int,           -- elapsed time at submission, when available
  completed_at timestamptz not null default now()
);

create index if not exists quiz_results_user_key_idx on public.quiz_results (user_id, quiz_key);
create index if not exists quiz_results_user_date_idx on public.quiz_results (user_id, completed_at desc);

alter table public.quiz_results enable row level security;

create policy "own quiz results: select" on public.quiz_results
  for select using (user_id = auth.uid());
create policy "own quiz results: insert" on public.quiz_results
  for insert with check (user_id = auth.uid());
