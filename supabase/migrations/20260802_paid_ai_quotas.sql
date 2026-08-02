-- Enforce the AI limits the paid plan cards already promise.
--
-- Until now checkout granted one undifferentiated "Premium" role and the
-- per-day "simulations IA" on the cards were marketing copy (see the NOTE in
-- src/constants/pricing.js). Two limits now apply to paid accounts:
--
--   1. PACE - 3 analyses per tâche per 5-minute window. Anti-spam only; it
--      never touches the daily count, so a candidate can work a whole
--      Expression écrite sitting (three tâches, the better part of an hour) and
--      still have spent one simulation.
--
--   2. DAILY SITTINGS - counted per épreuve, per UTC day:
--        Passeport 2, Visa 6, Première classe and VIP unlimited.
--      A sitting opens on the FIRST analysis and stays open while the candidate
--      keeps working; it ends after a long idle gap. Merely opening the
--      workshop or reading a subject costs nothing.
--
-- The free tier keeps its own separate mechanism (free_ai_uses): a hard 2 per
-- tâche that never resets.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

-- One row per account / épreuve / day.
create table if not exists public.ai_sittings (
  user_id uuid not null references auth.users (id) on delete cascade,
  section text not null,               -- 'ee' | 'eo'
  day date not null,                   -- UTC day
  sittings int not null default 0,
  last_activity timestamptz,           -- null = no sitting has ever opened
  primary key (user_id, section, day)
);

-- The rolling per-tâche window. One row per account / tâche, rewritten in place.
create table if not exists public.ai_pace (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_key text not null,              -- 'ee:1' … 'eo:3'
  window_started_at timestamptz,
  uses int not null default 0,
  primary key (user_id, task_key)
);

alter table public.ai_sittings enable row level security;
alter table public.ai_pace enable row level security;
-- No policies on purpose: service-role only, so a browser can neither read
-- these counters nor reset them.
revoke all on public.ai_sittings from anon, authenticated;
revoke all on public.ai_pace from anon, authenticated;

-- Decide and record one analysis in a single call.
--
-- `p_daily_limit` null means unlimited (Première classe, VIP, admins).
-- Returns allowed + a reason so the endpoint can explain WHICH limit was hit:
-- "wait a few minutes" and "come back tomorrow" are different messages.
create or replace function public.claim_ai_analysis(
  p_user uuid,
  p_section text,
  p_task_key text,
  p_daily_limit int,
  p_per_task int,
  p_window_secs int,
  p_idle_secs int
)
returns table (allowed boolean, reason text, task_left int, sittings_used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uses int;
  v_window timestamptz;
  v_sittings int;
  v_last timestamptz;
  v_today date := (now() at time zone 'utc')::date;
  v_new_sitting boolean := false;
begin
  -- PACE FIRST. A refused analysis must not consume a daily sitting, so the
  -- cheap check runs before anything is spent.
  insert into public.ai_pace (user_id, task_key, window_started_at, uses)
  values (p_user, p_task_key, now(), 0)
  on conflict (user_id, task_key) do nothing;

  select uses, window_started_at into v_uses, v_window
    from public.ai_pace
   where user_id = p_user and task_key = p_task_key
     for update;

  -- Window elapsed (or never started): the allowance starts over.
  if v_window is null or now() - v_window > make_interval(secs => p_window_secs) then
    v_uses := 0;
    v_window := now();
  end if;

  if v_uses >= p_per_task then
    return query select false, 'pace', 0, null::int;
    return;
  end if;

  -- DAILY SITTINGS.
  insert into public.ai_sittings (user_id, section, day, sittings, last_activity)
  values (p_user, p_section, v_today, 0, null)
  on conflict (user_id, section, day) do nothing;

  select sittings, last_activity into v_sittings, v_last
    from public.ai_sittings
   where user_id = p_user and section = p_section and day = v_today
     for update;

  -- A gap longer than p_idle_secs means the previous sitting is over and this
  -- analysis opens a new one.
  v_new_sitting := v_last is null or now() - v_last > make_interval(secs => p_idle_secs);

  if v_new_sitting and p_daily_limit is not null and v_sittings >= p_daily_limit then
    return query select false, 'daily', p_per_task - v_uses, v_sittings;
    return;
  end if;

  update public.ai_sittings
     set sittings = sittings + (case when v_new_sitting then 1 else 0 end),
         last_activity = now()
   where user_id = p_user and section = p_section and day = v_today
  returning sittings into v_sittings;

  update public.ai_pace
     set uses = v_uses + 1, window_started_at = v_window
   where user_id = p_user and task_key = p_task_key
  returning uses into v_uses;

  return query select true, null::text, greatest(p_per_task - v_uses, 0), v_sittings;
end;
$$;

-- Hand a paced use back when the AI call itself fails. The sitting stays open:
-- it is a window of activity, not a counter of successes.
create or replace function public.release_ai_pace(p_user uuid, p_task_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_pace
     set uses = greatest(uses - 1, 0)
   where user_id = p_user and task_key = p_task_key;
$$;

revoke execute on function public.claim_ai_analysis(uuid, text, text, int, int, int, int) from public, anon, authenticated;
revoke execute on function public.release_ai_pace(uuid, text) from public, anon, authenticated;
