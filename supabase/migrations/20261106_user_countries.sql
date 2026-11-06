-- Where each account connects from, by country.
--
-- The country is Vercel's reading of the request IP (x-vercel-ip-country),
-- recorded by POST /api/public/geo once per browser tab after sign-in
-- (api/_lib/public/geo.js). One row per (account, country): when it was first
-- and last seen, and how many tab sessions came from there. Shown to admins in
-- Administration › Utilisateurs.
--
-- Not the same thing as user_metadata.country, which is the country the person
-- TYPED at sign-up (their nationality / residence as they state it). This one
-- is where their connection actually comes from — a VPN shows up as the VPN's
-- country, which is a limit of IP geolocation, not a bug.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

create table if not exists public.user_countries (
  user_id uuid not null references auth.users (id) on delete cascade,
  country char(2) not null check (country ~ '^[A-Z]{2}$'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  visits integer not null default 1,
  primary key (user_id, country)
);

create index if not exists user_countries_last_seen_idx
  on public.user_countries (last_seen_at desc);

-- Server-only: written and read with the service-role key, which bypasses RLS.
-- RLS on with no policy means no browser session can read or write a row.
alter table public.user_countries enable row level security;

-- Insert-or-bump in one statement, so two tabs opening at once cannot race a
-- read-then-write into a lost visit.
create or replace function public.record_user_country(p_user uuid, p_country text)
returns void language sql security definer set search_path = public as $$
  insert into public.user_countries as uc (user_id, country)
  values (p_user, upper(p_country))
  on conflict (user_id, country) do update
    set last_seen_at = now(), visits = uc.visits + 1;
$$;

revoke all on function public.record_user_country(uuid, text) from public, anon, authenticated;
grant execute on function public.record_user_country(uuid, text) to service_role;
