-- Which kind of device a member was last seen on, for the admin Users view: a
-- phone or a computer icon next to their name, in « Connectés maintenant »,
-- « Dernières connexions » and the accounts table.
--
-- Rides on the presence ping of 20260722_presence.sql: the app already calls
-- touch_last_seen() on login and every heartbeat tick, so it now passes the
-- device kind along. Two values only — 'mobile' (phones and tablets) and
-- 'desktop' — read from the browser's user agent; anything else is ignored and
-- the column keeps its previous value.
--
-- The no-argument version is dropped rather than overloaded: with both present,
-- a call without arguments would be ambiguous. The new one defaults its
-- argument, so a client still calling touch_last_seen() with no body (an open
-- tab from before this deploy) keeps working and simply leaves the device as is.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`. The app
-- and the admin API both work without it — the icons just stay hidden.

alter table public.profiles add column if not exists last_seen_device text
  check (last_seen_device in ('mobile', 'desktop'));

drop function if exists public.touch_last_seen();

create or replace function public.touch_last_seen(p_device text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set last_seen_at = now(),
         last_seen_device = case when p_device in ('mobile', 'desktop') then p_device else last_seen_device end
   where id = auth.uid();
end;
$$;

revoke execute on function public.touch_last_seen(text) from public, anon;
grant execute on function public.touch_last_seen(text) to authenticated;
