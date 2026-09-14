-- Admin-created "gift links" shared on social media: whoever redeems one gets
-- a chosen paid plan for free, capped at N accounts per link.
--
-- Entitlement is granted the same way an admin's manual "set-plan" grant is
-- (api/_lib/admin/users.js) — directly on the account's app_metadata, no
-- Stripe checkout involved — so redeeming needs no payment method at all. See
-- api/_lib/public/gift.js. These two tables only track WHICH links exist and
-- WHO has already claimed one; the grant itself lives in app_metadata like
-- every other plan, so deleting a gift_links row later never takes back
-- access already given.
--
-- gift_links: one row per shareable link, created in Admin → Tarifs → Liens
-- cadeaux (api/_lib/admin/giftLinks.js). `plan_slug` matches a key in
-- api/_lib/passes.js — validated server-side against that allow-list, not
-- FK'd, since PASSES is code, not a table. `times_redeemed` is bumped with an
-- optimistic-lock UPDATE (see api/_lib/public/gift.js) so two people
-- redeeming the last open slot at the same moment can't both win it.
--
-- gift_link_redemptions: one row per successful redemption. `user_id` is
-- UNIQUE — an account may redeem at most ONE gift link, ever, so nobody can
-- stack free access by working through several links (or the same link
-- twice).
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

-- is_admin() ships with earlier migrations; redeclared here (owner-inclusive)
-- so this file stands alone, the same way 20260913_sujets_answers.sql does.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.gift_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan_slug text not null,
  max_redemptions int not null check (max_redemptions > 0),
  times_redeemed int not null default 0 check (times_redeemed >= 0),
  active boolean not null default true,
  note text check (note is null or char_length(note) <= 200),
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_link_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_link_id uuid not null references public.gift_links (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now()
);
create index if not exists gift_link_redemptions_link_idx on public.gift_link_redemptions (gift_link_id);

alter table public.gift_links enable row level security;
alter table public.gift_link_redemptions enable row level security;

-- All reads and writes go through the service-role API — management in
-- api/_lib/admin/giftLinks.js, validation/redemption in api/_lib/public/gift.js
-- — which bypasses RLS entirely. These policies are defensive only, the same
-- posture as admin_audit_log: an admin session can look at the data directly;
-- nobody else can touch it, and there is no insert/update/delete policy for
-- anyone — only the service role writes here.
drop policy if exists "gift links: admin read" on public.gift_links;
create policy "gift links: admin read" on public.gift_links
  for select using (public.is_admin());

drop policy if exists "gift redemptions: admin read" on public.gift_link_redemptions;
create policy "gift redemptions: admin read" on public.gift_link_redemptions
  for select using (public.is_admin());
