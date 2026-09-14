-- Model answers (« modèles de réponse ») for the Expression écrite subjects.
-- One row per (section, year, month, combinaison, tâche); `body` is the C1-C2
-- text and `keywords` the high-value expressions highlighted inside it.
-- Run in the Supabase SQL Editor or via `supabase db push`. Idempotent.
--
-- Why its own table rather than a field inside sujets_archive.data: the public
-- pages load EVERY month's `data` on each visit (src/services/sujetsArchiveService.js).
-- Burying ~2000 words of corrigé per combinaison in there would push that
-- payload at every visitor forever. Here the archive stays light and only the
-- answer page reads a row.

-- Premium gate, mirroring src/auth/rbac.js (hasActiveSubscription) and
-- api/_lib/auth.js (isPremiumUser): app_metadata.plan = 'Premium', still valid
-- while premium_until is absent or in the future. app_metadata is
-- server-controlled — a client cannot self-edit it — so this is a real paywall
-- and not just the UI hiding a link.
--
-- Caveat, deliberate: the JWT carries app_metadata as of the last token
-- refresh, so an expiry that passes mid-session is honoured on the next refresh
-- rather than instantly. The client-side guard re-evaluates on every render, so
-- the UI closes immediately either way.
create or replace function public.is_premium()
returns boolean language plpgsql stable as $$
declare
  meta jsonb := coalesce(auth.jwt() -> 'app_metadata', '{}'::jsonb);
  until_txt text;
  until_ts timestamptz;
begin
  if (meta ->> 'role') in ('admin', 'owner') then return true; end if;
  if (meta ->> 'plan') is distinct from 'Premium' then return false; end if;
  until_txt := meta ->> 'premium_until';
  if until_txt is null or until_txt = '' then return true; end if;
  -- A malformed date must not raise inside a row-security check: that would
  -- turn one bad account's metadata into an error for the whole query.
  begin
    until_ts := until_txt::timestamptz;
  exception when others then
    return false;
  end;
  return until_ts > now();
end;
$$;

-- is_admin() ships with earlier migrations; redeclared here (owner-inclusive)
-- so this file stands alone, the same way 20260728_sujets_archive.sql does.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.sujets_answers (
  id uuid primary key default gen_random_uuid(),
  section text not null default 'ee' check (section in ('ee')),
  year int not null check (year between 2000 and 2100),
  month_num int not null check (month_num between 1 and 12),
  n int not null check (n between 1 and 200),
  tache int not null check (tache between 1 and 3),
  body text not null,
  keywords jsonb not null default '[]'::jsonb,
  model text,
  generated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  unique (section, year, month_num, n, tache)
);

create index if not exists sujets_answers_month_idx
  on public.sujets_answers (section, year desc, month_num desc, n, tache);

alter table public.sujets_answers enable row level security;

-- anon gets NOTHING: the corrigés are the paid product. Writes are done
-- server-side with the service-role key (api/_lib/admin/sujetAnswers.js), which
-- bypasses RLS; the admin policies below exist so the table is still correct if
-- it is ever written through an admin session.
revoke all on public.sujets_answers from anon;
grant select on public.sujets_answers to authenticated;
grant insert, update, delete on public.sujets_answers to authenticated;

drop policy if exists "answers: premium read" on public.sujets_answers;
create policy "answers: premium read" on public.sujets_answers
  for select using (public.is_premium());

drop policy if exists "answers: admin insert" on public.sujets_answers;
create policy "answers: admin insert" on public.sujets_answers
  for insert with check (public.is_admin());

drop policy if exists "answers: admin update" on public.sujets_answers;
create policy "answers: admin update" on public.sujets_answers
  for update using (public.is_admin());

drop policy if exists "answers: admin delete" on public.sujets_answers;
create policy "answers: admin delete" on public.sujets_answers
  for delete using (public.is_admin());
