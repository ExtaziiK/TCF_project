-- Two AI analyses per tâche for a free account's TCF blanc.
--
-- Access was already gated (requirePremiumOrFreeMock), but nothing capped
-- VOLUME: inside the free exam the "Analyser avec l'IA" button could be pressed
-- indefinitely, and every press is a billable Groq call.
--
-- The counter deliberately does NOT live on exam_attempts. The update policy
-- there is `using (user_id = auth.uid())` with no column restriction, so the
-- client can write any column of its own attempt row — a quota kept there could
-- be reset from the browser console. This table has RLS enabled and NO
-- policies, so anon/authenticated can neither read nor write it; only the
-- service role (which bypasses RLS, used by api/_lib/auth.js) touches it.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

create table if not exists public.free_ai_uses (
  exam_attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  -- 'ee:1' … 'eo:3'. The endpoints validate the shape before calling in, so a
  -- forged key cannot mint a fresh bucket outside the six real tâches.
  task_key text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  uses int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (exam_attempt_id, task_key)
);

alter table public.free_ai_uses enable row level security;
-- No policies on purpose: service-role only. Revoking the PostgREST grants too
-- means the table is not even exposed to the anon/authenticated API surface.
revoke all on public.free_ai_uses from anon, authenticated;

-- Claim one use, atomically. Check-then-increment in two statements would let
-- concurrent requests (double-click, parallel tabs) each read "1" and both
-- pass; the WHERE on the upsert makes the limit the row's own condition, so at
-- most `p_limit` claims can ever succeed.
--
-- Returns the new count, or -1 when the quota is spent.
create or replace function public.claim_free_ai_use(
  p_attempt uuid,
  p_user uuid,
  p_task text,
  p_limit int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uses int;
begin
  insert into public.free_ai_uses (exam_attempt_id, task_key, user_id, uses)
  values (p_attempt, p_task, p_user, 1)
  on conflict (exam_attempt_id, task_key) do update
    set uses = free_ai_uses.uses + 1,
        updated_at = now()
    where free_ai_uses.uses < p_limit
  returning uses into v_uses;

  -- No row came back: the conflict fired and the WHERE refused the update,
  -- i.e. the tâche is already at its limit.
  if v_uses is null then
    return -1;
  end if;
  return v_uses;
end;
$$;

-- Give a use back when the AI call itself fails. Without this a transient Groq
-- 500 would silently burn one of only two attempts.
create or replace function public.release_free_ai_use(p_attempt uuid, p_task text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.free_ai_uses
     set uses = greatest(uses - 1, 0), updated_at = now()
   where exam_attempt_id = p_attempt and task_key = p_task;
$$;

-- Callable by the service role only — these bypass RLS by design, so the
-- browser must never reach them directly.
revoke execute on function public.claim_free_ai_use(uuid, uuid, text, int) from public, anon, authenticated;
revoke execute on function public.release_free_ai_use(uuid, text) from public, anon, authenticated;
