-- Subjects archive: the monthly TCF Canada Expression écrite / orale subjects,
-- managed from the admin "Questions" tab and read publicly on the Ressources
-- pages. One row per (section, year, month); `data` holds that month's payload
-- as JSON — combinaisons for EE, tâches→parties→sujets for EO. Anyone (incl.
-- logged-out visitors) may read; only admins may add, edit or remove.
-- Run in the Supabase SQL Editor or via `supabase db push`. Idempotent.

-- is_admin() ships with earlier migrations; redeclared here (identical) so this
-- migration stands alone.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.sujets_archive (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('ee', 'eo')),
  year int not null check (year between 2000 and 2100),
  month_num int not null check (month_num between 1 and 12),
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  unique (section, year, month_num)
);

create index if not exists sujets_archive_section_idx on public.sujets_archive (section, year desc, month_num desc);

alter table public.sujets_archive enable row level security;

-- anon/authenticated may read; authenticated may write (rows further gated to
-- admins by the policies below).
grant select on public.sujets_archive to anon, authenticated;
grant insert, update, delete on public.sujets_archive to authenticated;

drop policy if exists "sujets: public read" on public.sujets_archive;
create policy "sujets: public read" on public.sujets_archive
  for select using (true);

drop policy if exists "sujets: admin insert" on public.sujets_archive;
create policy "sujets: admin insert" on public.sujets_archive
  for insert with check (public.is_admin());

drop policy if exists "sujets: admin update" on public.sujets_archive;
create policy "sujets: admin update" on public.sujets_archive
  for update using (public.is_admin());

drop policy if exists "sujets: admin delete" on public.sujets_archive;
create policy "sujets: admin delete" on public.sujets_archive
  for delete using (public.is_admin());
