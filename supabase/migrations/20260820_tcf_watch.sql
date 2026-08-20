-- Veille TCF Moncton — the result of each exam-availability check.
--
-- The check itself CANNOT run here or in the browser, and it is worth writing
-- down why, because the table looks like something a cron should fill:
--
--   * the site (afmoncton.ca) 403s any non-browser request, and its calendar is
--     injected by JavaScript from a separate backend — a plain fetch sees zero
--     dates, so reading it needs a real rendered browser;
--   * the app's own CSP allows connect-src to Supabase only, so the front end
--     may not call afmoncton.ca even if it wanted to;
--   * the Vercel Hobby plan is at 12/12 functions and 2/2 crons, with no slot
--     left for a scheduled server-side check.
--
-- So a scheduled task on the owner's PC (tcf-moncton-watch/watch.mjs) does the
-- browsing and POSTs each result here with the service-role key. This table is
-- the app's read-only window onto that: rows are written by the watcher and
-- only ever SELECTed by the app.
--
-- Visibility is deliberately narrow — this is one person's exam search, not a
-- product feature. Hiding the nav entry is cosmetic; this policy is the actual
-- gate, so that guessing the route reveals nothing.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

create table if not exists public.tcf_watch_checks (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  -- 'match'    : at least one bookable session before the cutoff
  -- 'no_match' : sessions listed, none early enough
  -- 'failed'   : the calendar could not be read — NEVER conflated with no_match,
  --              since full sessions are simply absent from this site and the
  --              two would otherwise look identical to a reader.
  status text not null check (status in ('match', 'no_match', 'failed')),
  cutoff date not null,
  -- Every session seen, [{ dmy, iso, bookable }] — kept whole so the page can
  -- show the full calendar, not just the verdict.
  sessions jsonb not null default '[]'::jsonb,
  -- The subset that is bookable AND before the cutoff.
  qualifying jsonb not null default '[]'::jsonb,
  session_count int not null default 0,
  earliest_bookable date,
  -- Populated only when status = 'failed'.
  error text
);

create index if not exists tcf_watch_checks_time_idx
  on public.tcf_watch_checks (checked_at desc);

alter table public.tcf_watch_checks enable row level security;

grant select on public.tcf_watch_checks to authenticated;

-- Who may read: the one candidate this watch belongs to, plus staff.
-- is_admin() (20260708_questions.sql, widened for owner in 20260722_owner_role)
-- reads app_metadata.role from the JWT, which the client cannot self-edit.
--
-- The email comes from the JWT too, not from a profile row a user could update.
drop policy if exists "tcf watch: read own watch" on public.tcf_watch_checks;
create policy "tcf watch: read own watch" on public.tcf_watch_checks
  for select to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'elouchtati@gmail.com'
    or public.is_admin()
  );

-- No insert/update/delete policy for `authenticated` at all: the watcher writes
-- with the service-role key, which bypasses RLS. A signed-in browser therefore
-- cannot forge a "match" — the only thing the app can do here is read.
