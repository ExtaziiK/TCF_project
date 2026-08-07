-- Profiles inside one account, like Netflix or Crunchyroll: several candidates
-- share a Première classe or VIP pass, each with their own progression and an
-- optional PIN.
--
-- WHAT THE PIN IS, AND IS NOT. Every profile belongs to ONE Supabase account
-- and therefore ONE JWT, so RLS cannot tell them apart — and anyone choosing a
-- profile already knows the account password. The PIN stops a sibling opening
-- the wrong profile; it is not a security boundary, and nothing here pretends
-- otherwise. It is stored hashed so it is not readable in plain text, not
-- because that makes it strong.
--
-- Progression means exam_attempts and quiz_results. question_attempts is
-- deliberately NOT split: it feeds the admin's per-question difficulty stats,
-- which are meant to aggregate across everyone.
--
-- Quotas stay per ACCOUNT. Only Première classe and VIP get profiles, and both
-- are already unlimited on AI simulations and mock exams, so there is nothing
-- for profiles to divide.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

create table if not exists public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  -- Index into the palette the chooser draws avatars from.
  accent smallint not null default 0 check (accent between 0 and 5),
  -- SHA-256 of "<profile id>:<pin>", or null for a profile that opens on a
  -- single click. Salted with the id so the same PIN on two profiles does not
  -- produce the same hash.
  pin_hash text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists learner_profiles_user_idx on public.learner_profiles (user_id, created_at);

alter table public.learner_profiles enable row level security;
grant select, insert, update, delete on public.learner_profiles to authenticated;

-- How many profiles this account may hold, from the plan baked into the JWT.
-- Mirrors the device counts already sold on the pricing cards: Première classe
-- 2, VIP 4, everyone else 1.
create or replace function public.max_learner_profiles()
returns int
language sql
stable
as $$
  select case
    when coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'owner') then 4
    when not public.is_premium_or_admin() then 1
    else case coalesce(auth.jwt() -> 'app_metadata' ->> 'plan_label', '')
      when 'VIP' then 4
      when 'Première classe' then 2
      else 1
    end
  end;
$$;

-- Counts without tripping over the policy being defined: a policy that queries
-- its own table under RLS is how recursive-policy errors start.
create or replace function public.learner_profile_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.learner_profiles where user_id = auth.uid();
$$;

drop policy if exists "learner_profiles: own read" on public.learner_profiles;
create policy "learner_profiles: own read" on public.learner_profiles
  for select using (user_id = auth.uid());

-- The cap lives HERE rather than in the UI: the client writes these rows with
-- the anon key, so a hidden "add profile" button would stop nobody.
drop policy if exists "learner_profiles: own insert" on public.learner_profiles;
create policy "learner_profiles: own insert" on public.learner_profiles
  for insert with check (
    user_id = auth.uid()
    and public.learner_profile_count() < public.max_learner_profiles()
  );

drop policy if exists "learner_profiles: own update" on public.learner_profiles;
create policy "learner_profiles: own update" on public.learner_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "learner_profiles: own delete" on public.learner_profiles;
create policy "learner_profiles: own delete" on public.learner_profiles
  for delete using (user_id = auth.uid());

-- One profile for every existing account, named from what we already show them,
-- so nobody meets an empty chooser and no history is orphaned.
insert into public.learner_profiles (user_id, name)
select u.id,
       left(coalesce(
         nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
         nullif(btrim(p.username), ''),
         'Profil 1'
       ), 30)
  from auth.users u
  left join public.profiles p on p.id = u.id
 where not exists (select 1 from public.learner_profiles lp where lp.user_id = u.id);

-- ── progression, keyed by profile ───────────────────────────────────────────
-- Nullable and ON DELETE CASCADE: deleting a profile takes its history with it,
-- which is what "separate progression" has to mean when someone is removed.
alter table public.exam_attempts
  add column if not exists profile_id uuid references public.learner_profiles (id) on delete cascade;
alter table public.quiz_results
  add column if not exists profile_id uuid references public.learner_profiles (id) on delete cascade;

-- Existing history belongs to the account's first (and so far only) profile.
update public.exam_attempts a
   set profile_id = (select lp.id from public.learner_profiles lp
                      where lp.user_id = a.user_id order by lp.created_at limit 1)
 where a.profile_id is null;

update public.quiz_results q
   set profile_id = (select lp.id from public.learner_profiles lp
                      where lp.user_id = q.user_id order by lp.created_at limit 1)
 where q.profile_id is null;

create index if not exists exam_attempts_profile_idx on public.exam_attempts (profile_id, started_at desc);
create index if not exists quiz_results_profile_idx on public.quiz_results (profile_id);
