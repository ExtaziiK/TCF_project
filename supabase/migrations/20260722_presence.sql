-- Presence ("who is logged in right now") for the admin Users view.
--
-- The single-active-session machinery only records *which* device holds the
-- session, never when the user was last active. This adds a lightweight
-- last-seen timestamp the signed-in app pings on a timer, so the admin can see
-- live connections without any realtime infrastructure: "online" is simply
-- "pinged within the last few minutes".
--
-- Clients can't write the column directly (profiles UPDATE is restricted to the
-- username column by 20260714), so the ping goes through a SECURITY DEFINER
-- function scoped to the caller's own row — a client can only ever mark itself.

alter table public.profiles add column if not exists last_seen_at timestamptz;

create or replace function public.touch_last_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set last_seen_at = now() where id = auth.uid();
end;
$$;

revoke execute on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;
