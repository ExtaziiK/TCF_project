-- Let a free account create the one TCF blanc it is entitled to.
--
-- 20260707 restricted INSERT on exam_attempts (and exam_attempt_tasks) to
-- premium/admin, which was right when mock exams were Premium-only. Now that a
-- "Sans papier" account gets one, that policy rejects the insert — and
-- examService.createAttempt falls back to localStorage on failure, so the exam
-- appeared to work while existing nowhere on the server.
--
-- That silent fallback is what made the symptom confusing: the exam ran, but
-- api/media.js and api/_lib/auth.js both identify the free exam by looking the
-- attempt up in the database, found nothing, and fell back to the quiz-1-only
-- tier. Result: an exam with no audio and no images, and an AI correction that
-- would have been refused.
--
-- The one-per-account limit has to live HERE, not only in the app: RLS is the
-- only thing between a free account and unlimited attempts, since the client
-- writes these rows directly with the anon key.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

-- Does the caller already have a free attempt? SECURITY DEFINER so the count
-- is not itself filtered by the policy being defined (a policy that queries its
-- own table under RLS is how recursive-policy errors start).
create or replace function public.has_free_exam_attempt()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.exam_attempts
    where user_id = auth.uid()
      and coalesce((progress->>'free')::boolean, false)
  );
$$;
revoke execute on function public.has_free_exam_attempt() from public, anon;
grant execute on function public.has_free_exam_attempt() to authenticated;

-- ── exam_attempts: premium as before, or a first free attempt ───────────────
drop policy if exists "own attempts: insert (premium)" on public.exam_attempts;
drop policy if exists "own attempts: insert" on public.exam_attempts;
create policy "own attempts: insert" on public.exam_attempts
  for insert with check (
    user_id = auth.uid()
    and (
      public.is_premium_or_admin()
      -- A free account may insert exactly one row, and only one it has marked
      -- as the free mock. The flag is what every server-side check keys on
      -- (media signing, the AI endpoints), so a row without it buys nothing.
      or (
        coalesce((progress->>'free')::boolean, false)
        and not public.has_free_exam_attempt()
      )
    )
  );

-- ── exam_attempt_tasks: follow whatever the parent attempt is allowed to be ──
drop policy if exists "own attempt tasks: insert (premium)" on public.exam_attempt_tasks;
drop policy if exists "own attempt tasks: insert" on public.exam_attempt_tasks;
create policy "own attempt tasks: insert" on public.exam_attempt_tasks
  for insert with check (
    exists (
      select 1 from public.exam_attempts a
      where a.id = exam_attempt_id
        and a.user_id = auth.uid()
        and (public.is_premium_or_admin() or coalesce((a.progress->>'free')::boolean, false))
    )
  );
