-- Site settings: a tiny key/value store for admin-editable, publicly-readable
-- content. First use: `home_label`, a free-text banner shown on the public
-- Accueil (landing) page. Anyone — including logged-out visitors — may read a
-- setting; only admins may create or edit one. Run in the Supabase dashboard
-- (SQL Editor) or via `supabase db push`. Idempotent.

-- is_admin() ships with earlier migrations; redeclared here (identical) so this
-- migration stands alone.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.site_settings (
  key text primary key,
  value text not null default '' check (char_length(value) <= 2000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.site_settings enable row level security;

-- Table-level grants (RLS still governs the rows): anon/authenticated may read,
-- authenticated may write (rows further restricted to admins by the policies).
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

-- Public content: anyone (anon included) may read every setting.
drop policy if exists "settings: public read" on public.site_settings;
create policy "settings: public read" on public.site_settings
  for select using (true);

-- Only admins may create or edit a setting.
drop policy if exists "settings: admin insert" on public.site_settings;
create policy "settings: admin insert" on public.site_settings
  for insert with check (public.is_admin());
drop policy if exists "settings: admin update" on public.site_settings;
create policy "settings: admin update" on public.site_settings
  for update using (public.is_admin());

-- Seed the home-page label row (empty by default → the banner stays hidden).
insert into public.site_settings (key, value) values ('home_label', '')
  on conflict (key) do nothing;
