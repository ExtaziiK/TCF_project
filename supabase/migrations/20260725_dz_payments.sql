-- Algerian (DZD) manual-payment flow. Visitors who pick the DZD currency on the
-- Tarifs page are sent to an on-site checkout (CCP / BaridiMob bank transfer)
-- instead of Stripe. They upload a receipt; the owner reviews the request in the
-- admin "Demandes" inbox and grants the plan. Two pieces live here:
--   1. subscription_requests   — one row per submitted request
--   2. storage bucket "receipts" — the uploaded proof-of-payment files
-- Editable account details (CCP number/key/holder, BaridiMob RIP, WhatsApp group
-- link, per-plan DZD prices) reuse the existing site_settings table under the
-- key 'payment_dz' (seeded empty below). Idempotent — safe to re-run.

-- is_admin() ships with earlier migrations; redeclared here (identical) so this
-- migration stands alone.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

/* --------------------------- subscription requests ------------------------ */

create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  name text,
  plan text not null,             -- plan display name ("Passeport", …)
  plan_days int,                  -- access window granted on approval
  method text not null,           -- 'ccp' | 'baridimob'
  amount_dzd text,                -- amount shown at checkout, e.g. "2600 DA"
  reference text,                 -- optional transaction / CCP reference
  notes text,                     -- optional free-text note from the user
  receipt_path text,              -- storage object path in the "receipts" bucket
  status text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists subscription_requests_status_idx
  on public.subscription_requests (status, created_at desc);

alter table public.subscription_requests enable row level security;

grant select, insert on public.subscription_requests to authenticated;
grant update, delete on public.subscription_requests to authenticated;

-- A signed-in user may create their own request …
drop policy if exists "subreq: own insert" on public.subscription_requests;
create policy "subreq: own insert" on public.subscription_requests
  for insert to authenticated with check (user_id = auth.uid());

-- … and read their own back (to confirm it was received).
drop policy if exists "subreq: own read" on public.subscription_requests;
create policy "subreq: own read" on public.subscription_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Only admins may triage (approve/reject) or delete requests.
drop policy if exists "subreq: admin update" on public.subscription_requests;
create policy "subreq: admin update" on public.subscription_requests
  for update to authenticated using (public.is_admin());
drop policy if exists "subreq: admin delete" on public.subscription_requests;
create policy "subreq: admin delete" on public.subscription_requests
  for delete to authenticated using (public.is_admin());

/* ------------------------------ receipts bucket --------------------------- */

-- Private bucket: proof-of-payment images/PDFs. The owner views them via
-- short-lived signed URLs from the admin panel.
insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

-- Users upload into a folder named after their own uid ("<uid>/<file>"), so a
-- user can only ever write their own receipts.
drop policy if exists "receipts: own upload" on storage.objects;
create policy "receipts: own upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Admins may read any receipt (to sign a URL); a user may read their own.
drop policy if exists "receipts: admin or own read" on storage.objects;
create policy "receipts: admin or own read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));

-- Admins may delete a receipt (e.g. alongside deleting its request).
drop policy if exists "receipts: admin delete" on storage.objects;
create policy "receipts: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and public.is_admin());

/* ------------------------- editable payment settings ---------------------- */

-- Seed the DZD payment config row (empty → the checkout shows "à configurer"
-- until the owner fills it in from the admin "Tarifs" tab). Stored as JSON in
-- site_settings (see 20260721_site_settings.sql for the table + RLS).
insert into public.site_settings (key, value) values ('payment_dz', '')
  on conflict (key) do nothing;
