-- Security hardening. Run in the Supabase dashboard (SQL Editor) or via
-- `supabase db push`.
--
-- Safe to run against any database state: sections whose table hasn't been
-- created yet (because an earlier migration was never applied) are skipped —
-- the base migrations (20260708_questions.sql, 20260710_question_attempts.sql)
-- now create the hardened policies directly, so a fresh install needs no
-- retrofit. Re-running this file is also harmless.
--
-- 1. questions: reading active questions now requires a signed-in user. Every
--    page that consumes them (practice, exams, workshops) already sits behind
--    the AUTHENTICATED route policy, so visitors never see this data anyway —
--    but the old anyone-can-read policy let the anon key dump every question
--    (including the correct answer in `payload`) straight from the table.
-- 2. question_attempts: inserts must come from a signed-in user and may not be
--    attributed to someone else. The old `with check (true)` let anonymous
--    callers spam rows or spoof another user's id, poisoning the QMS analytics.
-- 3. profiles.active_session_id: claimed server-side only. It used to be
--    written by the client under "profiles: update own", so any account could
--    null it out with its own JWT and permanently disable the single-active-
--    session enforcement (including the api/_lib/auth.js check). Clients now go
--    through claim_device_session(), which generates the id itself — a caller
--    can never choose the value — and direct column updates are revoked.

-- ── 1. questions: authenticated read ────────────────────────────────────────
do $$
begin
  if to_regclass('public.questions') is not null then
    drop policy if exists "questions: read active" on public.questions;
    create policy "questions: read active" on public.questions
      for select using ((status = 'active' and auth.uid() is not null) or public.is_admin());
  end if;
end $$;

-- ── 2. question_attempts: no anonymous / spoofed inserts ────────────────────
do $$
begin
  if to_regclass('public.question_attempts') is not null then
    drop policy if exists "attempts: anyone insert" on public.question_attempts;
    drop policy if exists "attempts: insert own" on public.question_attempts;
    create policy "attempts: insert own" on public.question_attempts
      for insert with check (
        auth.uid() is not null
        and (user_id is null or user_id = auth.uid())
      );
  end if;
end $$;

-- ── 3. profiles: server-generated device session ────────────────────────────
-- Clients keep row-level UPDATE (RLS "profiles: update own") but only on the
-- username column; active_session_id can no longer be written directly.
do $$
begin
  if to_regclass('public.profiles') is not null then
    revoke update on public.profiles from anon, authenticated;
    grant update (username) on public.profiles to authenticated;
  end if;
end $$;

-- Claims this login as the account's single active session. SECURITY DEFINER:
-- runs as the function owner, so the column grant above doesn't block it. The
-- id is generated here — never accepted from the caller — so a client cannot
-- clear the claim or replay another device's id.
create or replace function public.claim_device_session()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  sid text := gen_random_uuid()::text;
begin
  if auth.uid() is null then
    return null;
  end if;
  update public.profiles set active_session_id = sid where id = auth.uid();
  return sid;
end;
$$;
revoke execute on function public.claim_device_session() from public, anon;
grant execute on function public.claim_device_session() to authenticated;
