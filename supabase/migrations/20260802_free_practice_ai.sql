-- Free practice: one Expression écrite subject and one Expression orale
-- subject outside the TCF blanc, with the same two-AI-analyses-per-tâche cap.
--
-- 20260802_free_ai_uses keyed the quota on (exam_attempt_id, task_key), which
-- only describes work done inside an exam attempt. Standalone practice has no
-- attempt, so the quota is generalised to (user_id, quota_key) where the key
-- carries its own scope:
--     'attempt:<uuid>:ee:1'   — inside the free TCF blanc
--     'practice:ee:1'         — the free standalone workshop
-- The two scopes are separate budgets on purpose: the free TCF blanc is a
-- sample of the exam, the workshop is a sample of the workshop.
--
-- Written to run whether or not 20260802_free_ai_uses was applied first, and
-- safe to re-run.

-- Matches the previous shape when the table is absent, so the ALTERs below have
-- something to work on either way.
create table if not exists public.free_ai_uses (
  exam_attempt_id uuid references public.exam_attempts (id) on delete cascade,
  task_key text,
  user_id uuid not null references auth.users (id) on delete cascade,
  uses int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.free_ai_uses add column if not exists quota_key text;

-- Carry any rows written under the attempt-only scheme into the new key.
update public.free_ai_uses
   set quota_key = 'attempt:' || exam_attempt_id::text || ':' || task_key
 where quota_key is null and exam_attempt_id is not null and task_key is not null;
delete from public.free_ai_uses where quota_key is null;

-- The old primary key goes FIRST: a column that is part of a primary key is
-- implicitly NOT NULL, and Postgres refuses `drop not null` while it is
-- (ERROR 42P16), so the constraint has to be gone before the columns relax.
alter table public.free_ai_uses drop constraint if exists free_ai_uses_pkey;

-- exam_attempt_id stays (nullable) purely for its ON DELETE CASCADE: deleting
-- an attempt should still take its quota rows with it. Practice rows leave it
-- null, which is why it can no longer be part of the key.
alter table public.free_ai_uses alter column exam_attempt_id drop not null;
alter table public.free_ai_uses alter column task_key drop not null;
alter table public.free_ai_uses alter column quota_key set not null;

alter table public.free_ai_uses add constraint free_ai_uses_pkey primary key (user_id, quota_key);

alter table public.free_ai_uses enable row level security;
-- No policies on purpose: service-role only, so the browser can neither read
-- the counters nor reset them.
revoke all on public.free_ai_uses from anon, authenticated;

-- The old signatures no longer apply.
drop function if exists public.claim_free_ai_use(uuid, uuid, text, int);
drop function if exists public.release_free_ai_use(uuid, text);
drop function if exists public.free_ai_uses_for_attempt(uuid);

-- Claim one use, atomically. Check-then-increment in two statements would let
-- concurrent requests (double-click, parallel tabs) each read "1" and both
-- pass; putting the limit in the upsert's WHERE makes it the row's own
-- condition, so at most `p_limit` claims can ever succeed.
--
-- Returns the new count, or -1 when the quota is spent.
create or replace function public.claim_free_ai_use(
  p_user uuid,
  p_key text,
  p_limit int,
  p_attempt uuid default null,
  p_task text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uses int;
begin
  insert into public.free_ai_uses (user_id, quota_key, exam_attempt_id, task_key, uses)
  values (p_user, p_key, p_attempt, p_task, 1)
  on conflict (user_id, quota_key) do update
    set uses = free_ai_uses.uses + 1,
        updated_at = now()
    where free_ai_uses.uses < p_limit
  returning uses into v_uses;

  -- No row came back: the conflict fired and the WHERE refused the update,
  -- i.e. this tâche is already at its limit.
  if v_uses is null then
    return -1;
  end if;
  return v_uses;
end;
$$;

-- Give a use back when the AI call itself fails. Without this a transient Groq
-- 500 would silently burn one of only two attempts.
create or replace function public.release_free_ai_use(p_user uuid, p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.free_ai_uses
     set uses = greatest(uses - 1, 0), updated_at = now()
   where user_id = p_user and quota_key = p_key;
$$;

-- Callable by the service role only — these bypass RLS by design, so the
-- browser must never reach them directly.
revoke execute on function public.claim_free_ai_use(uuid, text, int, uuid, text) from public, anon, authenticated;
revoke execute on function public.release_free_ai_use(uuid, text) from public, anon, authenticated;
