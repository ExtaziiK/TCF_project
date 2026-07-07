-- Examens blancs: attempt storage.
-- Run this in the Supabase dashboard (SQL Editor) or via `supabase db push`.
--
-- Each attempt owns its randomized task set (exam_attempt_tasks) so the exam
-- stays identical across resumes. Rows are RLS-scoped to their owner, and
-- creation is limited to Premium users and admins (read from the JWT's
-- app_metadata, which clients cannot edit).

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score jsonb,          -- { ok, total, pct, points, level, perTask: [...] }
  progress jsonb        -- { taskIndex, picks, indexAt, timeLeft, results }
);

create table if not exists public.exam_attempt_tasks (
  id bigint generated always as identity primary key,
  exam_attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  quiz_id text not null,   -- bank quiz id (derived from the JSON file, not hardcoded)
  section text not null,   -- co | ce | ee | eo (open for future categories)
  task_order int not null,
  unique (exam_attempt_id, task_order)
);

create index if not exists exam_attempts_user_idx on public.exam_attempts (user_id, started_at desc);

alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_tasks enable row level security;

-- Premium plan or admin role, as set in app_metadata (server-controlled).
create or replace function public.is_premium_or_admin()
returns boolean language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'app_metadata' ->> 'plan') = 'Premium',
    false
  );
$$;

create policy "own attempts: select" on public.exam_attempts
  for select using (user_id = auth.uid());
create policy "own attempts: insert (premium)" on public.exam_attempts
  for insert with check (user_id = auth.uid() and public.is_premium_or_admin());
create policy "own attempts: update" on public.exam_attempts
  for update using (user_id = auth.uid());
create policy "own attempts: delete" on public.exam_attempts
  for delete using (user_id = auth.uid());

create policy "own attempt tasks: select" on public.exam_attempt_tasks
  for select using (exists (select 1 from public.exam_attempts a where a.id = exam_attempt_id and a.user_id = auth.uid()));
create policy "own attempt tasks: insert (premium)" on public.exam_attempt_tasks
  for insert with check (
    public.is_premium_or_admin()
    and exists (select 1 from public.exam_attempts a where a.id = exam_attempt_id and a.user_id = auth.uid())
  );
create policy "own attempt tasks: delete" on public.exam_attempt_tasks
  for delete using (exists (select 1 from public.exam_attempts a where a.id = exam_attempt_id and a.user_id = auth.uid()));
