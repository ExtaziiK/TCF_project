-- Single active session per account ("last login wins"). Each successful login
-- writes a fresh random id here (overwriting any other device's), and every
-- other device — whose locally-stored id no longer matches — is signed out on
-- its next validation check. The billable API routes (api/_lib/auth.js) also
-- refuse a request whose presented id doesn't match, so a superseded device
-- can't keep calling the paid endpoints on its still-valid JWT.
--
-- Nullable: accounts that never logged in since this shipped carry null and are
-- simply unaffected until their next login claims a session. Written by the
-- user's own client under the existing "profiles: update own" RLS policy — no
-- new policy needed (the row is gated by id = auth.uid()).
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.

alter table public.profiles add column if not exists active_session_id text;
