-- Device-limit policy: EVICT-OLDEST instead of REJECT.
--
-- Supersedes the reject policy from 20260724. The per-plan allowance is
-- unchanged (Première classe → 2, VIP → 4, admins/owners → 4, everyone else
-- → 1); what changes is what happens when every slot is taken:
--
--   before → the new login is refused ('device_limit_reached'), and the user
--            had to sign out on one of their own devices to free a slot.
--   now    → the new login always succeeds, and the OLDEST still-active device
--            is dropped from the set (first in, first out).
--
-- The evicted device signs itself out on its own: its locally-stored id is no
-- longer in active_session_ids, which is exactly the condition the app's
-- existing validation + heartbeat already watch for (authService
-- isDeviceSessionActive → AppProvider), so it lands on the "used on another
-- device" notice within a heartbeat tick (≤45s, or immediately on tab focus).
-- No client change is required for the eviction itself to work.
--
-- release_device_session (explicit sign-out) is unchanged and still useful: it
-- frees a slot immediately so the account's own devices aren't evicted in turn.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run. Until it IS applied the 20260724 version stays in place and
-- keeps rejecting — the app still handles that response (see api/login.js), so
-- deploying the app before the migration degrades to the old behaviour rather
-- than breaking login.

-- ── Claim a device slot (evicting the oldest if needed) ─────────────────────
-- Signature and security properties are identical to 20260724: SECURITY
-- DEFINER so it can read the caller's plan (auth.users) and write the column
-- despite the client's UPDATE being revoked (20260714); the returned id is
-- generated HERE and never accepted from the caller; p_current lets a device
-- that is re-authenticating drop its own previous id first, so a re-login
-- replaces that slot instead of consuming a new one (and can't evict itself).
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
  drop_n int;
begin
  if uid is null then
    return null;
  end if;

  select public.device_limit_for(coalesce(u.raw_app_meta_data, '{}'::jsonb))
    into lim from auth.users u where u.id = uid;
  lim := greatest(coalesce(lim, 1), 1);

  select active_session_ids into cur from public.profiles where id = uid;
  cur := coalesce(cur, '{}');

  -- Re-authenticating on a device we already know? Free its old slot first, so
  -- this login reuses it rather than evicting someone to make room for a
  -- device that was already in the set.
  if p_current is not null then
    cur := array_remove(cur, p_current);
  end if;

  -- At capacity → drop the OLDEST entries to make room. The array is in claim
  -- order (append-only at the tail, and array_remove preserves order), so the
  -- oldest live devices are at the front and drop_n of them have to go. drop_n
  -- is computed rather than looped-once so a limit that has SHRUNK since the
  -- last claim — a plan downgrade leaving 4 ids behind a limit of 1 — is
  -- trimmed all the way down in a single step.
  --
  -- Rebuilt via unnest WITH ORDINALITY rather than an array slice on purpose:
  -- a Postgres slice PRESERVES the original subscript bounds, so a repeated
  -- `cur := cur[2:array_length(cur,1)]` starts trimming from the wrong end
  -- after the first pass (it would evict the NEWEST devices on a downgrade).
  -- Ordinality is always 1-based, whatever the array's bounds.
  drop_n := coalesce(array_length(cur, 1), 0) - lim + 1;
  if drop_n > 0 then
    select coalesce(array_agg(x order by ord), '{}'::text[])
      into cur
      from unnest(cur) with ordinality as t(x, ord)
     where ord > drop_n;
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
