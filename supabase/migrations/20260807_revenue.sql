-- Revenue accounting, in Algerian dinars.
--
-- The DZD side of the business is cash-like: a buyer transfers by CCP or
-- BaridiMob, uploads a receipt, and the owner approves the request in the admin
-- "Demandes" inbox (20260725_dz_payments.sql). Approving IS the sale — that is
-- the moment the money is confirmed received. Until now nothing recorded it as
-- such: subscription_requests knew the amount only as display text ("2600 DA")
-- and knew no approval date at all, so "how much did we make this month" had no
-- answer the database could give.
--
-- Two pieces here:
--   1. subscription_requests gains approved_at + amount_received_dzd — WHEN the
--      sale closed and, as a real number, HOW MUCH actually landed (which can
--      differ from the asked amount: a promo, a rounding, a partial transfer).
--   2. revenue_entries — payments taken outside the inbox entirely (cash in
--      hand, a transfer settled over WhatsApp, a renewal granted by hand from
--      the Utilisateurs tab). Without it those sales would be invisible.
--
-- Stripe (USD) revenue is deliberately NOT modelled here: Stripe's own
-- dashboard is the ledger for it, and mixing two currencies in one column is
-- how books go wrong. This is the dinar ledger.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

-- is_admin() ships with earlier migrations; redeclared here (owner-inclusive,
-- matching 20260722_owner_role.sql) so this migration stands alone.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

/* ------------------- what an approved request actually earned ------------- */

alter table public.subscription_requests
  add column if not exists approved_at timestamptz,
  add column if not exists amount_received_dzd numeric(12, 2);

comment on column public.subscription_requests.approved_at is
  'When the owner approved the request — the date the sale counts on. Null while pending.';
comment on column public.subscription_requests.amount_received_dzd is
  'Dinars actually received, as a number. Seeded from amount_dzd on approval, editable in the Revenus tab.';

-- Backfill. Rows approved before this migration have neither field: date them
-- by the request itself (the inbox is worked through same-day, so created_at is
-- the closest honest approximation) and read the amount out of the display
-- text — "2600 DA" → 2600, "2 600 DA" → 2600.
update public.subscription_requests
   set approved_at = created_at
 where status = 'approved' and approved_at is null;

update public.subscription_requests
   set amount_received_dzd = nullif(regexp_replace(coalesce(amount_dzd, ''), '[^0-9]', '', 'g'), '')::numeric
 where status = 'approved'
   and amount_received_dzd is null
   and amount_dzd ~ '[0-9]';

-- The Revenus tab reads approved sales newest-first; the pending inbox has its
-- own (status, created_at) index and is untouched by this one.
create index if not exists subscription_requests_approved_idx
  on public.subscription_requests (approved_at desc)
  where status = 'approved';

/* ---------------------------- off-inbox payments -------------------------- */

create table if not exists public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  -- The date the money came in, not the date it was typed here: the owner
  -- often records a payment a day or two late, and back-dating must not move
  -- revenue into the wrong month.
  occurred_at timestamptz not null default now(),
  amount_dzd numeric(12, 2) not null check (amount_dzd >= 0 and amount_dzd < 100000000),
  plan text check (plan is null or char_length(plan) <= 60),
  method text not null default 'cash' check (method in ('ccp', 'baridimob', 'cash', 'other')),
  customer text check (customer is null or char_length(customer) <= 120),
  email text check (email is null or char_length(email) <= 200),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists revenue_entries_occurred_idx
  on public.revenue_entries (occurred_at desc);

alter table public.revenue_entries enable row level security;

grant select, insert, update, delete on public.revenue_entries to authenticated;

-- Admin-only in every direction: these are the books. No self-service policy,
-- unlike subscription_requests, because no buyer ever writes a row here.
drop policy if exists "revenue: admin read" on public.revenue_entries;
create policy "revenue: admin read" on public.revenue_entries
  for select to authenticated using (public.is_admin());

drop policy if exists "revenue: admin insert" on public.revenue_entries;
create policy "revenue: admin insert" on public.revenue_entries
  for insert to authenticated with check (public.is_admin());

drop policy if exists "revenue: admin update" on public.revenue_entries;
create policy "revenue: admin update" on public.revenue_entries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "revenue: admin delete" on public.revenue_entries;
create policy "revenue: admin delete" on public.revenue_entries
  for delete to authenticated using (public.is_admin());
