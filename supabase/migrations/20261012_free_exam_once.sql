-- One free TCF blanc per account, for good.
--
-- 20260802_free_exam_attempt limits a free account to one row flagged
-- progress.free — but it counted the rows that EXIST. A free account could
-- delete its attempt ("Abandonner", or a direct DELETE under "own attempts:
-- delete") and insert a fresh one, getting unlimited free exams, each with its
-- own two-per-tache AI quota (the quota key carries the attempt id). It could
-- also UPDATE an old Premium-era attempt to add the free flag.
--
-- The fix records the first free attempt on the profile, where the client
-- cannot write (UPDATE on profiles is revoked, 20260714), and refuses any
-- update that adds the flag to a row that did not already carry it.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

alter table public.profiles add column if not exists free_exam_used_at timestamptz;

-- Backfill: every account already holding a free attempt has used it.
update public.profiles p
   set free_exam_used_at = coalesce(p.free_exam_used_at, a.first_at)
  from (
    select user_id, min(started_at) as first_at
      from public.exam_attempts
     where coalesce((progress->>'free')::boolean, false)
     group by user_id
  ) a
 where a.user_id = p.id;

-- The insert policy's check now also consults the stamp, so deleting the row
-- no longer frees the slot.
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
  ) or exists (
    select 1 from public.profiles
    where id = auth.uid() and free_exam_used_at is not null
  );
$$;
revoke execute on function public.has_free_exam_attempt() from public, anon;
grant execute on function public.has_free_exam_attempt() to authenticated;

-- Stamp the profile once a free attempt lands. AFTER INSERT, so the insert
-- policy (which runs before) still sees the account as not yet stamped.
create or replace function public.stamp_free_exam_used()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((new.progress->>'free')::boolean, false) then
    update public.profiles
       set free_exam_used_at = coalesce(free_exam_used_at, now())
     where id = new.user_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_free_exam_used() from public, anon, authenticated;

drop trigger if exists exam_attempts_stamp_free on public.exam_attempts;
create trigger exam_attempts_stamp_free
  after insert on public.exam_attempts
  for each row execute function public.stamp_free_exam_used();

-- The free flag can be kept or dropped by an update, never added: it is what
-- the AI endpoints and media signing key on.
create or replace function public.guard_free_exam_flag()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce((new.progress->>'free')::boolean, false)
     and not coalesce((old.progress->>'free')::boolean, false)
     and auth.role() is distinct from 'service_role' then
    raise exception 'free flag cannot be added to an existing attempt' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists exam_attempts_guard_free on public.exam_attempts;
create trigger exam_attempts_guard_free
  before update on public.exam_attempts
  for each row execute function public.guard_free_exam_flag();
