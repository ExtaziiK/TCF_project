-- Proof that a buyer expressly asked for immediate access and acknowledged
-- losing the right of withdrawal. One row per purchase attempt, append-only.
--
-- Why this exists: CGU section 7 says the buyer "demande expressément
-- l'exécution immédiate du Service et reconnaît perdre, de ce fait, le droit de
-- rétractation". Stating that in the contract is not the same as obtaining it —
-- for a distance contract over digital content the request has to be made by
-- the consumer, before performance begins, and the trader has to be able to
-- show it was. Until this table, nothing in the purchase flow captured it, so
-- section 7's non-refundability had nothing standing behind it.
--
-- Why not terms_acceptances (20260730): that table is one row per (user,
-- version) with a unique index, deliberately, because accepting the CGU happens
-- once per published text. A waiver happens once per PURCHASE — same user, same
-- version, several passes over time — so it needs its own row each time.
--
-- Why no client insert policy: the row is written by
-- api/create-checkout-session.js with the service-role key, from the same
-- request that creates the Stripe session. Evidence the other party can edit is
-- not evidence — the same reasoning as the 20260730 migration. There is no
-- update or delete policy either, so a row can only be altered with the
-- service-role key.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent.

-- is_admin() ships with earlier migrations; redeclared here (owner-inclusive,
-- matching 20260722_owner_role.sql) so this migration stands alone.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.withdrawal_waivers (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Which text the acknowledgement was made against, so a later rewrite of
  -- section 7 stays distinguishable from what this buyer actually saw.
  terms_version text not null check (char_length(terms_version) between 1 and 40),
  -- What was being bought. Kept as the Stripe price id rather than a plan name:
  -- names get re-labelled, price ids do not.
  price_id text check (price_id is null or char_length(price_id) <= 120),
  channel text not null default 'stripe' check (channel in ('stripe', 'dz')),
  acknowledged_at timestamptz not null default now(),
  ip inet,
  user_agent text check (user_agent is null or char_length(user_agent) <= 300)
);

create index if not exists withdrawal_waivers_user_idx
  on public.withdrawal_waivers (user_id, acknowledged_at desc);

alter table public.withdrawal_waivers enable row level security;

-- Readable by the person it concerns (so it can be surfaced in their profile if
-- ever wanted) and by admins handling a refund dispute. Nothing else: no
-- insert, update or delete policy, on purpose.
drop policy if exists "withdrawal_waivers: read own" on public.withdrawal_waivers;
create policy "withdrawal_waivers: read own" on public.withdrawal_waivers
  for select using (auth.uid() = user_id or public.is_admin());

comment on table public.withdrawal_waivers is
  'Per-purchase record that the buyer expressly requested immediate performance and acknowledged losing the withdrawal right (CGU s.7). Written server-side by api/create-checkout-session.js; never by the client.';
