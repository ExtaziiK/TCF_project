-- Admin-initiated disconnect: sign an account out on every device, now.
--
-- Why a new column rather than reusing "reset-sessions": clearing
-- active_session_ids FAILS OPEN on purpose (authService.checkDeviceSession
-- allows a null/empty set, so a pre-migration or offline DB never boots a
-- legitimately signed-in user). That makes it useless as a kick —
-- it frees the account's device slots so a locked-out user can sign in again,
-- which is a different job. A revocation needs a positive signal.
--
-- How the disconnect reaches the device: the app already re-checks its device
-- session every 45s and on tab focus (AppProvider heartbeat). That check now
-- also compares sessions_revoked_at against the timestamp this browser stored
-- when it claimed its slot; a revocation stamped AFTER the claim means "an
-- admin ended this session", and the device signs itself out with its own
-- notice. So a disconnect lands within a heartbeat tick (immediately if the tab
-- is focused), and a device that is offline or closed signs out the moment it
-- comes back — the marker persists.
--
-- The admin action also clears active_session_ids, so the disconnect does not
-- leave the account's slots occupied: the user can sign straight back in. The
-- fresh login stores a claim timestamp newer than sessions_revoked_at, so the
-- marker stops applying without having to be cleared.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run. Inert until applied: the client's read of the column fails
-- open (a missing column yields no value → nothing is treated as revoked), so
-- deploying the app first degrades to "no disconnect" rather than breaking.

alter table public.profiles add column if not exists sessions_revoked_at timestamptz;

comment on column public.profiles.sessions_revoked_at is
  'Set by the admin Users panel (service role) to sign the account out on every device. A device whose stored claim timestamp predates this value signs itself out. Never written by clients.';

-- No new grant is needed for writes: 20260714 revoked UPDATE on public.profiles
-- from anon/authenticated and re-granted it on the (username) column only, so
-- this column is already unwritable by clients and stays that way. The admin API
-- writes it with the service-role key, which bypasses RLS entirely.
--
-- Reads: clients keep row-level SELECT on their own profile ("profiles: select
-- own"), which is what lets the heartbeat see its own revocation marker. That
-- policy is column-agnostic, so nothing to add here.
