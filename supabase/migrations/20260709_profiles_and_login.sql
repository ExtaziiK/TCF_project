-- Username login + brute-force lockout.
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
--
-- 1. profiles: one unique username per auth user. Usernames are stored
--    lowercased (login is case-insensitive) and constrained to a safe charset.
-- 2. A trigger creates a profile automatically for every new signup (email or
--    OAuth), deriving/deduping a username so signup can never fail on a clash.
-- 3. is_username_available(): public check so the registration form can warn
--    before submit, without exposing anyone's email.
-- 4. login_attempts: server-only table backing the 5-try / 10-minute lockout
--    (enforced by api/login.js with the service-role key).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_.-]{3,30}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read and rename their own profile; the unique constraint guards
-- collisions. Inserts happen through the trigger below (security definer), so
-- no insert policy is needed.
drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Generates a valid, unique username from a desired value (falling back to the
-- email local-part), sanitising the charset and appending a number on clash.
create or replace function public.gen_unique_username(desired text, email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  cand text;
  n int := 0;
begin
  base := regexp_replace(lower(coalesce(nullif(trim(desired), ''), split_part(coalesce(email, ''), '@', 1))), '[^a-z0-9_.-]', '', 'g');
  if char_length(base) < 3 then base := rpad(base, 3, 'x'); end if;
  base := left(base, 30);
  cand := base;
  while exists (select 1 from public.profiles where username = cand) loop
    n := n + 1;
    cand := left(base, 30 - char_length(n::text)) || n::text;
  end loop;
  return cand;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, public.gen_unique_username(new.raw_user_meta_data ->> 'username', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Public availability check for the registration form (no email exposed).
create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(candidate))
  );
$$;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- Backfill a profile for every pre-existing user.
do $$
declare r record;
begin
  for r in select u.id, u.email from auth.users u
           where not exists (select 1 from public.profiles p where p.id = u.id)
  loop
    insert into public.profiles (id, username)
    values (r.id, public.gen_unique_username(null, r.email));
  end loop;
end $$;

-- Brute-force lockout counter. Server-only: RLS on with no policies means only
-- the service-role key (api/login.js) can read or write it.
create table if not exists public.login_attempts (
  identifier text primary key,   -- normalized account key (email, lowercased)
  fail_count int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.login_attempts enable row level security;
