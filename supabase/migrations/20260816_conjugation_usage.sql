-- Le compteur quotidien de l'onglet Conjugaison.
--
-- A free account gets ten minutes of conjugation PRACTICE per day (the lessons
-- themselves are never metered). This table is where those seconds are kept.
--
-- Why a table at all, when localStorage would do: localStorage is per browser,
-- so the same account gets a fresh ten minutes in every browser, every private
-- window, and after every "clear site data". That is acceptable slack for a
-- soft upsell, not for the number the paywall is built on — so the counter
-- lives with the account. src/services/conjugationQuotaService.js still falls
-- back to localStorage when this migration has not been applied (error 42P01),
-- exactly like quiz_results and dictee_sessions do, so the tab keeps working
-- on a database where this file has not been run yet.
--
-- Keyed on (user_id, day), NOT on the learner profile. quiz_results and
-- dictee_sessions scope their history per profile because that history belongs
-- to a learner; an entitlement belongs to the ACCOUNT that pays for it. Keying
-- it per profile would hand a free account ten minutes for every profile it
-- cares to create, which is the whole quota defeated by a button already in
-- the UI.
--
-- `day` is the candidate's LOCAL date, computed in the browser and sent as a
-- string, not `current_date`. A candidate in Montréal and one in Alger must
-- both get their reset at their own midnight — reading the server clock would
-- give one of them a day that ends in the middle of the afternoon.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

create table if not exists public.conjugation_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- YYYY-MM-DD in the candidate's own timezone. See header.
  day date not null,
  -- Seconds spent on the practice column today. Capped by the client at the
  -- daily limit; stored uncapped so a change to the limit can be applied
  -- retroactively without the data having been rounded off first.
  seconds int not null default 0 check (seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists conjugation_usage_user_day_idx
  on public.conjugation_usage (user_id, day desc);

alter table public.conjugation_usage enable row level security;

grant select, insert, update on public.conjugation_usage to authenticated;

drop policy if exists "conjugation usage: read own" on public.conjugation_usage;
create policy "conjugation usage: read own" on public.conjugation_usage
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "conjugation usage: insert own" on public.conjugation_usage;
create policy "conjugation usage: insert own" on public.conjugation_usage
  for insert to authenticated with check (auth.uid() = user_id);

-- Update is needed because the client upserts the running total every 30 s.
-- It is deliberately not a "set to anything" policy in spirit: the client only
-- ever raises the number, and greatest() in the service keeps a stale tab from
-- writing a LOWER total over a fresher one. A determined user can still POST a
-- smaller number here — which is the honest limit of a client-side timer, and
-- the reason this gate is an upsell rather than a security boundary.
drop policy if exists "conjugation usage: update own" on public.conjugation_usage;
create policy "conjugation usage: update own" on public.conjugation_usage
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No delete policy: a candidate cannot wipe today's counter to buy themselves
-- a second ten minutes.
