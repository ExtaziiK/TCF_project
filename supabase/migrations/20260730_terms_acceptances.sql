-- Proof that a user accepted the conditions générales: one row per (user,
-- version), append-only. Run in the Supabase dashboard (SQL Editor) or via
-- `supabase db push`. Idempotent.
--
-- Why a table rather than user_metadata (where the consent used to be stored):
-- user_metadata is writable by the account itself — any signed-in user can call
-- auth.updateUser() from the browser and erase or backdate their own record.
-- Evidence the other party can edit is not evidence. Here the row is stamped by
-- the database and there is no update or delete policy, so once written it can
-- only be changed with the service-role key.
--
-- What a usable record needs, and where each part comes from:
--   who         user_id, defaulted to auth.uid() and pinned by the RLS check
--   what        version — bump TERMS_VERSION (src/constants/terms.js) whenever
--               the wording changes; the text of each version lives in git
--   when        accepted_at, forced to now() for anything coming through the
--               API so a client cannot backdate its own consent
--   how         source (email signup / Google onboarding / re-acceptance)
--   from where  ip + user_agent, read from the request headers server-side
--
-- The ip/user_agent columns are optional evidence: drop them if you would
-- rather hold less personal data — nothing in the app reads them.

-- is_admin() ships with earlier migrations; redeclared here (owner-inclusive,
-- matching 20260722_owner_role.sql) so this migration stands alone.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.terms_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  source text not null default 'unknown'
    check (source in ('email_signup', 'google_onboarding', 'reacceptance', 'backfill', 'unknown')),
  ip inet,
  user_agent text check (user_agent is null or char_length(user_agent) <= 300)
);

-- One acceptance per version per user: re-ticking the same version is a no-op
-- (the client relies on this to be retry-safe), while a new version always
-- creates a new row, so the history is preserved rather than overwritten.
create unique index if not exists terms_acceptances_user_version_idx
  on public.terms_acceptances (user_id, version);
-- "Who accepted 1.0, and when" — the lookup an audit or a dispute starts from.
create index if not exists terms_acceptances_version_idx
  on public.terms_acceptances (version, accepted_at desc);

-- Stamps the row server-side. Requests arriving through the API carry
-- request.headers; inserts made by the signup trigger or by hand in the SQL
-- editor do not, which is what tells the two apart — a client-supplied
-- accepted_at is overwritten, a server-supplied one (the backfill below) is
-- kept.
create or replace function public.stamp_terms_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hdrs json;
begin
  begin
    hdrs := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    hdrs := null;
  end;

  if hdrs is null then
    return new; -- server-side insert: trust what it wrote
  end if;

  new.accepted_at := now();
  new.user_agent := nullif(left(coalesce(hdrs ->> 'user-agent', ''), 300), '');
  begin
    -- x-forwarded-for is "client, proxy1, proxy2" — the first hop is the client.
    new.ip := nullif(btrim(split_part(coalesce(hdrs ->> 'x-forwarded-for', ''), ',', 1)), '')::inet;
  exception when others then
    new.ip := null;
  end;
  return new;
end;
$$;

drop trigger if exists stamp_terms_acceptance on public.terms_acceptances;
create trigger stamp_terms_acceptance
  before insert on public.terms_acceptances
  for each row execute function public.stamp_terms_acceptance();

-- Email signup: authService.signUp() puts the accepted version in the new
-- user's metadata, and this trigger turns it into the authoritative row at the
-- moment the account is created — server-authored, so the browser never gets to
-- choose the timestamp. Deliberately a second trigger rather than an edit to
-- handle_new_user() (20260709), which keeps profile creation untouched.
-- Consent bookkeeping must never be able to fail a signup, hence the catch-all.
create or replace function public.record_signup_terms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'terms_version' then
    insert into public.terms_acceptances (user_id, version, source)
    values (new.id, left(new.raw_user_meta_data ->> 'terms_version', 40), 'email_signup')
    on conflict (user_id, version) do nothing;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_terms on auth.users;
create trigger on_auth_user_created_terms
  after insert on auth.users
  for each row execute function public.record_signup_terms();

alter table public.terms_acceptances enable row level security;

-- Table-level grants (RLS still governs the rows).
grant select, insert on public.terms_acceptances to authenticated;

-- A user sees their own consent history; admins see everyone's, which is how
-- you answer "prove this account agreed to 1.0".
drop policy if exists "terms: select own" on public.terms_acceptances;
create policy "terms: select own" on public.terms_acceptances
  for select using (user_id = auth.uid() or public.is_admin());

-- A user may only ever record consent for themselves. The Google-onboarding and
-- re-acceptance paths insert through this policy; version and source are the
-- only fields the client supplies, everything else is defaulted or stamped.
drop policy if exists "terms: insert own" on public.terms_acceptances;
create policy "terms: insert own" on public.terms_acceptances
  for insert with check (user_id = auth.uid());

-- No update and no delete policy, on purpose: the record is append-only for
-- everyone, including the account owner and admins. Only the service-role key
-- can touch a row once it exists.

-- Backfill from the old user_metadata consent so nothing already collected is
-- lost. Accounts created before consent was recorded at all have no row and no
-- way to invent one — they get the re-acceptance gate on their next visit.
insert into public.terms_acceptances (user_id, version, source, accepted_at)
select
  u.id,
  left(u.raw_user_meta_data ->> 'terms_version', 40),
  'backfill',
  coalesce((u.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz, u.created_at)
from auth.users u
where u.raw_user_meta_data ? 'terms_version'
  and char_length(coalesce(u.raw_user_meta_data ->> 'terms_version', '')) between 1 and 40
on conflict (user_id, version) do nothing;
