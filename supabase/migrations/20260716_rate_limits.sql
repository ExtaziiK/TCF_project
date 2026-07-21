-- Server-side rate limiting. Run in the Supabase dashboard (SQL Editor) or
-- via `supabase db push`. Idempotent.
--
-- One row per (endpoint, caller) key holding a fixed-window counter. Only the
-- API layer (service role) may touch it: RLS is enabled with no policies, and
-- bump_rate_limit() is revoked from anon/authenticated. The serverless
-- endpoints fail open when this migration hasn't been applied yet (they fall
-- back to a best-effort in-memory counter), so deploying code before running
-- this SQL degrades gracefully instead of breaking requests.

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 1
);

alter table public.rate_limits enable row level security;
-- No policies on purpose: the service role bypasses RLS; everyone else is out.

-- Atomically bumps the counter for `p_key` and reports whether the caller is
-- still within `p_max` requests per `p_window_seconds`. A window that has
-- elapsed restarts the count instead of accumulating forever.
create or replace function public.bump_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case
      when rl.window_start <= now() - make_interval(secs => p_window_seconds) then 1
      else rl.count + 1
    end,
    window_start = case
      when rl.window_start <= now() - make_interval(secs => p_window_seconds) then now()
      else rl.window_start
    end
  returning count <= p_max into allowed;

  -- Opportunistic cleanup so stale keys (one-off IPs) don't accumulate.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return allowed;
end;
$$;

revoke execute on function public.bump_rate_limit(text, integer, integer) from public, anon, authenticated;
