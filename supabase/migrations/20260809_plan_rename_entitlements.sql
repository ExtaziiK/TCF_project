-- Two functions hardcode the exact plan_label strings they grant extra
-- allowances for: device_limit_for() (multi-device sessions, 20260724) and
-- max_learner_profiles() (family/shared-account profiles, 20260804). 2026-08-09's
-- plan rename (Visa -> Starter, Première classe -> Pro, VIP -> Ultimate;
-- Passeport discontinued) changes what a NEW purchase writes into plan_label,
-- but does nothing to accounts that already bought under the old names — their
-- plan_label is frozen at whatever string was current at their checkout, and
-- stays that way forever.
--
-- Without this migration, a candidate who buys "Pro" today gets plan_label =
-- 'Pro', which matches neither function's WHEN clause below (both still check
-- for 'Première classe' only) and falls through to the 1-profile/1-device
-- "everyone else" default — silently losing an entitlement they paid for. Same
-- for a new "Ultimate" buyer landing on 1 instead of 4.
--
-- Fix: recognise BOTH the legacy and the current label for each renamed tier,
-- in both functions. Two labels, one entitlement, until the legacy label falls
-- out of use (nothing writes it anymore, so this only ever shrinks with time).
-- Passeport was never a multi-device or multi-profile tier (it always fell
-- through to the 1 "everyone else" default, same as Sans papier), so it needs
-- no entry in either function — discontinuing it changes nothing here.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.
create or replace function public.device_limit_for(meta jsonb)
returns int
language sql
immutable
as $$
  select case
    when coalesce(meta->>'role', '') in ('admin', 'owner') then 4
    when meta->>'plan_label' in ('VIP', 'Ultimate') then 4
    when meta->>'plan_label' in ('Première classe', 'Pro') then 2
    else 1
  end;
$$;

create or replace function public.max_learner_profiles()
returns int
language sql
stable
as $$
  select case
    when coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'owner') then 4
    when not public.is_premium_or_admin() then 1
    else case coalesce(auth.jwt() -> 'app_metadata' ->> 'plan_label', '')
      when 'VIP' then 4
      when 'Ultimate' then 4
      when 'Première classe' then 2
      when 'Pro' then 2
      else 1
    end
  end;
$$;
