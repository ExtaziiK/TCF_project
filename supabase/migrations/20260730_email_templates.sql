-- Email templates: the copy of the transactional emails (renewal reminders),
-- editable from Admin › Emails instead of requiring a deploy. Run in the
-- Supabase dashboard (SQL Editor) or via `supabase db push`. Idempotent.
--
-- Unlike site_settings, this table is NOT publicly readable: a template can
-- carry a promo code, and a world-readable row would hand every visitor the
-- discount. Admins read and write through the policies below; the daily cron
-- reads with the service role, which bypasses RLS.
--
-- No rows are seeded on purpose. The shipped copy lives in
-- api/_lib/emailTemplates.js (DEFAULTS) and is used whenever a row is absent,
-- so the wording is defined in exactly one place. Saving in the admin panel
-- creates the row; "Réinitialiser" deletes it and falls back to the default.

-- is_admin() ships with earlier migrations; redeclared here (owner-inclusive,
-- matching 20260722_owner_role.sql) so this migration stands alone without
-- narrowing the gate back to admin-only.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.email_templates (
  -- Matches a key in DEFAULTS: 'expiring_soon' | 'expired'.
  key text primary key,
  subject text not null check (char_length(subject) between 1 and 200),
  -- The HTML fragment placed inside the branded shell — not a whole document.
  body text not null check (char_length(body) between 1 and 8000),
  -- Off pauses that email entirely: the cron skips the account and leaves the
  -- reminder un-armed, so turning it back on resumes without a gap.
  enabled boolean not null default true,
  -- Optional Stripe promo code advertised in the message (Admin › Promos).
  promo_code text check (promo_code is null or char_length(promo_code) <= 30),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.email_templates enable row level security;

-- No grants to anon: an unauthenticated visitor cannot read a promo code here.
grant select, insert, update, delete on public.email_templates to authenticated;

drop policy if exists "email templates: admin read" on public.email_templates;
create policy "email templates: admin read" on public.email_templates
  for select using (public.is_admin());

drop policy if exists "email templates: admin insert" on public.email_templates;
create policy "email templates: admin insert" on public.email_templates
  for insert with check (public.is_admin());

drop policy if exists "email templates: admin update" on public.email_templates;
create policy "email templates: admin update" on public.email_templates
  for update using (public.is_admin());

-- Deleting a row is how the admin restores the shipped default.
drop policy if exists "email templates: admin delete" on public.email_templates;
create policy "email templates: admin delete" on public.email_templates
  for delete using (public.is_admin());
