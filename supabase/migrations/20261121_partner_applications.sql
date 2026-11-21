-- Partner applications from the public /partenaires page: language schools and
-- training centres, content creators (Instagram, YouTube, TikTok) and anyone
-- else who wants to work with Passerelle.
--
-- Written only by the service-role API (api/_lib/public/partner.js), which
-- rate-limits, validates per kind and emails the team; there is deliberately
-- no insert policy, so the anon key cannot fill the table directly. Read and
-- worked through in Administration → Partenaires, client-direct through the
-- admin policies below (same pattern as contact_messages).
--
-- `status` is the pipeline the owner works through: new → meeting (a meeting
-- is booked) → accepted | declined. `admin_notes` is private to the team.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('school', 'creator', 'other')),
  status text not null default 'new' check (status in ('new', 'meeting', 'accepted', 'declined')),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  phone text check (phone is null or char_length(phone) <= 40),
  country text check (country is null or char_length(country) <= 60),
  city text check (city is null or char_length(city) <= 80),
  -- school / organisation
  organisation text check (organisation is null or char_length(organisation) <= 160),
  role text check (role is null or char_length(role) <= 120),
  students_per_year text check (students_per_year is null or char_length(students_per_year) <= 40),
  tests text[] not null default '{}',
  current_prep text check (current_prep is null or char_length(current_prep) <= 1000),
  -- creator
  links jsonb not null default '{}'::jsonb,
  audience_size text check (audience_size is null or char_length(audience_size) <= 40),
  audience_country text check (audience_country is null or char_length(audience_country) <= 120),
  topics text check (topics is null or char_length(topics) <= 300),
  -- everyone
  message text check (message is null or char_length(message) <= 3000),
  lang text check (lang is null or lang in ('fr', 'en')),
  user_id uuid references auth.users (id) on delete set null,
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_applications_created_idx on public.partner_applications (created_at desc);
create index if not exists partner_applications_status_idx on public.partner_applications (status);

alter table public.partner_applications enable row level security;

drop policy if exists "partner_applications admin read" on public.partner_applications;
create policy "partner_applications admin read" on public.partner_applications
  for select using (public.is_admin());

drop policy if exists "partner_applications admin update" on public.partner_applications;
create policy "partner_applications admin update" on public.partner_applications
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "partner_applications admin delete" on public.partner_applications;
create policy "partner_applications admin delete" on public.partner_applications
  for delete using (public.is_admin());

create or replace function public.partner_applications_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists partner_applications_touch on public.partner_applications;
create trigger partner_applications_touch before update on public.partner_applications
  for each row execute function public.partner_applications_touch();
