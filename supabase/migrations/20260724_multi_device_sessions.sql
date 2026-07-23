-- Multi-device sessions by plan tier. Supersedes the single active_session_id
-- scalar (20260713) with a bounded SET of session ids: the account stays signed
-- in on up to N devices at once, where N comes from the plan —
--   Première classe → 2,  VIP → 4,  admins/owners → 4,  everyone else → 1.
--
-- Policy is REJECT (not silent eviction): when every slot is held by another
-- device, a new login is refused (claim_device_session raises
-- 'device_limit_reached'); the user frees a slot by signing out on one of their
-- devices (release_device_session). An admin can clear a locked-out account's
-- slots from the Users panel (service-role update of the column below).
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run. Inert until applied: the app's read/write of the column fail
-- open, so a pre-migration DB never wrongly boots a signed-in user.

-- ── Column + backfill ───────────────────────────────────────────────────────
alter table public.profiles add column if not exists active_session_ids text[];

-- Fold any existing single session into the array so the upgrade doesn't sign
-- currently-logged-in devices out.
update public.profiles
   set active_session_ids = array[active_session_id]
 where active_session_id is not null
   and active_session_ids is null;

-- ── Per-plan device allowance ───────────────────────────────────────────────
-- Derived from app_metadata (role / plan_label). Kept in SQL so the claim
-- function and any DB-side logic share one definition; the JS side reaches it by
-- calling claim_device_session rather than duplicating the mapping. Keep the
-- tier names in sync with src/constants/pricing.js and api/_lib/admin/users.js.
create or replace function public.device_limit_for(meta jsonb)
returns int
language sql
immutable
as $$
  select case
    when coalesce(meta->>'role', '') in ('admin', 'owner') then 4
    when meta->>'plan_label' = 'VIP' then 4
    when meta->>'plan_label' = 'Première classe' then 2
    else 1
  end;
$$;

-- ── Claim a device slot ─────────────────────────────────────────────────────
-- The single-session predecessor (zero-arg) is dropped so a no-arg call can't
-- resolve to it; the new signature takes the caller's current device id.
drop function if exists public.claim_device_session();

-- SECURITY DEFINER so it can read the caller's plan (auth.users) and write the
-- column despite the client's UPDATE being revoked (20260714). The returned id
-- is generated HERE — never accepted from the caller — so a client can neither
-- choose an id nor clear the set. p_current lets a device that is
-- re-authenticating drop its own previous id first, so re-login replaces that
-- slot instead of consuming a new one (and so it can't lock itself out).
create or replace function public.claim_device_session(p_current text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  sid text := gen_random_uuid()::text;
  uid uuid := auth.uid();
  lim int;
  cur text[];
begin
  if uid is null then
    return null;
  end if;

  select public.device_limit_for(coalesce(u.raw_app_meta_data, '{}'::jsonb))
    into lim from auth.users u where u.id = uid;
  lim := greatest(coalesce(lim, 1), 1);

  select active_session_ids into cur from public.profiles where id = uid;
  cur := coalesce(cur, '{}');

  -- Re-authenticating on a device we already know? Free its old slot first.
  if p_current is not null then
    cur := array_remove(cur, p_current);
  end if;

  -- At capacity with only OTHER devices → refuse. No silent eviction: the user
  -- must sign out on one of their devices to make room.
  if coalesce(array_length(cur, 1), 0) >= lim then
    raise exception 'device_limit_reached';
  end if;

  cur := array_append(cur, sid);
  -- active_session_id (legacy scalar) tracks the newest device, so any old app
  -- build still validating against it keeps working (as single-device) during a
  -- deploy window.
  update public.profiles set active_session_ids = cur, active_session_id = sid where id = uid;
  return sid;
end;
$$;
revoke execute on function public.claim_device_session(text) from public, anon;
grant execute on function public.claim_device_session(text) to authenticated;

-- ── Release a device slot (sign-out) ────────────────────────────────────────
-- Removes the caller's own session id from the set so a slot frees up. Best
-- effort: an unknown id is a no-op.
create or replace function public.release_device_session(p_sid text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_sid is null then
    return;
  end if;
  update public.profiles
     set active_session_ids = array_remove(coalesce(active_session_ids, '{}'), p_sid),
         active_session_id = case when active_session_id = p_sid then null else active_session_id end
   where id = uid;
end;
$$;
revoke execute on function public.release_device_session(text) from public, anon;
grant execute on function public.release_device_session(text) to authenticated;
