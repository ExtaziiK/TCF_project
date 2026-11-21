-- The partner space (« Espace partenaire »): an accepted application becomes a
-- partner, whose sales and commission payouts are tracked here.
--
-- partners: one row per activated partner, created from Administration →
-- Partenaires (api/_lib/admin/partners.js). `email` is the address the partner
-- applied with; `user_id` is filled the first time an account whose VERIFIED
-- email matches opens /espace-partenaire (api/_lib/public/partner.js, GET), so
-- a partner may sign up before or after being accepted. Teachers and creators
-- carry a promo `code` (a Stripe promotion code), the discount it gives and
-- their commission rate; schools carry `seats` and `access_until` (used by the
-- school accounts that come next).
--
-- partner_sales: one row per purchase made with a partner's code — a Stripe
-- card checkout (stripe-webhook.js) or an approved dinar transfer
-- (api/_lib/admin/moderation.js). `external_id` makes recording idempotent
-- (a redelivered webhook or a double click inserts nothing). The commission is
-- computed and frozen at the time of sale, so changing a partner's rate later
-- never rewrites what was already earned.
--
-- partner_payouts: commissions the team has paid out, entered by hand.
--
-- All three are read and written by the service-role API; the admin console
-- also reads them client-direct through the admin policies. Partners never read
-- these tables directly — their space is served by the API, which leaves the
-- buyers' identities out.
--
-- Also adds subscription_requests.promo_code: the code a dinar buyer applied,
-- until now only written inside the notes.
--
-- Run in the Supabase dashboard (SQL Editor). Idempotent — safe to re-run.

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  application_id uuid unique references public.partner_applications (id) on delete set null,
  kind text not null check (kind in ('school', 'teacher', 'creator', 'other')),
  name text not null check (char_length(name) between 1 and 160),
  email text not null check (char_length(email) between 3 and 200),
  user_id uuid unique references auth.users (id) on delete set null,
  code text unique check (code is null or code ~ '^[A-Z0-9_-]{3,30}$'),
  discount_pct numeric(5, 2) check (discount_pct is null or (discount_pct > 0 and discount_pct <= 100)),
  commission_pct numeric(5, 2) check (commission_pct is null or (commission_pct >= 0 and commission_pct <= 100)),
  seats int check (seats is null or seats >= 0),
  access_until date,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partners_email_idx on public.partners (lower(email));

create table if not exists public.partner_sales (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  source text not null check (source in ('stripe', 'dzd')),
  external_id text not null unique,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (char_length(currency) between 3 and 3),
  plan text check (plan is null or char_length(plan) <= 60),
  commission_pct numeric(5, 2) not null default 0,
  commission numeric(12, 2) not null default 0,
  buyer_user_id uuid references auth.users (id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index if not exists partner_sales_partner_idx on public.partner_sales (partner_id, occurred_at desc);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (char_length(currency) between 3 and 3),
  method text check (method is null or method in ('wise', 'bank', 'baridimob', 'cash', 'other')),
  note text check (note is null or char_length(note) <= 500),
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create index if not exists partner_payouts_partner_idx on public.partner_payouts (partner_id, paid_at desc);

alter table public.partners enable row level security;
alter table public.partner_sales enable row level security;
alter table public.partner_payouts enable row level security;

drop policy if exists "partners admin all" on public.partners;
create policy "partners admin all" on public.partners
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "partner_sales admin all" on public.partner_sales;
create policy "partner_sales admin all" on public.partner_sales
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "partner_payouts admin all" on public.partner_payouts;
create policy "partner_payouts admin all" on public.partner_payouts
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.partners_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists partners_touch on public.partners;
create trigger partners_touch before update on public.partners
  for each row execute function public.partners_touch();

alter table public.subscription_requests add column if not exists promo_code text
  check (promo_code is null or char_length(promo_code) <= 30);
