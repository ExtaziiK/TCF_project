-- Clicks on the public social links (footer strip + Contact page cards).
--
-- Why not a link shortener: constants/social.js is deliberately the one place a
-- channel URL lives — the footer, the Contact cards and the Organization
-- `sameAs` in the structured data all read it. Routing clicks through a
-- shortener would mean a second set of URLs to keep in step, and `sameAs` must
-- stay the real profile addresses or the entries stop being usable as identity
-- signals. Why not Vercel custom events: those are a Pro feature, and this
-- project is on Hobby (page views only).
--
-- Deliberately anonymous. No user id, no IP, no user agent, no referer — the
-- only thing recorded is WHICH channel was clicked and FROM WHERE on the site.
-- That keeps the table outside personal-data territory entirely: nothing here
-- can be tied back to a person, so it needs no consent banner and adds nothing
-- to the privacy policy's obligations. Counting clicks does not require knowing
-- who clicked.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

-- is_admin() ships with earlier migrations; redeclared here (owner-inclusive,
-- matching 20260722_owner_role.sql) so this migration stands alone.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.social_clicks (
  id bigint generated always as identity primary key,
  -- Constrained to the known channels rather than left as free text: this is
  -- the one table on the site an anonymous visitor may write to, so the only
  -- thing a script can do with it is inflate a counter — it cannot store
  -- arbitrary strings for someone else to read back.
  network text not null check (network in ('youtube', 'tiktok', 'instagram', 'facebook', 'whatsapp')),
  placement text not null default 'footer' check (placement in ('footer', 'contact')),
  created_at timestamptz not null default now()
);

create index if not exists social_clicks_date_idx on public.social_clicks (created_at desc);

alter table public.social_clicks enable row level security;

-- The footer is on every page including the logged-out ones, so anon has to be
-- able to write — most people who click "Instagram" have no account.
grant insert on public.social_clicks to anon, authenticated;
grant select on public.social_clicks to authenticated;

drop policy if exists "social clicks: anyone may record" on public.social_clicks;
create policy "social clicks: anyone may record" on public.social_clicks
  for insert to anon, authenticated with check (true);

-- Reading is the owner's business only. No update or delete policy at all.
drop policy if exists "social clicks: admin read" on public.social_clicks;
create policy "social clicks: admin read" on public.social_clicks
  for select to authenticated using (public.is_admin());

-- PostgREST cannot GROUP BY, and shipping every row to the browser to count
-- them there would get slower every month. security invoker, so the admin
-- read policy above still decides who sees anything: a non-admin caller gets
-- an empty result, not a leak.
create or replace function public.social_click_stats(since_days int default 30)
returns table (network text, placement text, clicks bigint, last_click timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select sc.network, sc.placement, count(*)::bigint, max(sc.created_at)
  from public.social_clicks sc
  where sc.created_at >= now() - make_interval(days => greatest(1, least(365, since_days)))
  group by sc.network, sc.placement
  order by count(*) desc;
$$;

grant execute on function public.social_click_stats(int) to authenticated;
