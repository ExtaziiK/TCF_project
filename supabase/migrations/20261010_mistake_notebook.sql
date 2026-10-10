-- Carnet d'erreurs: every bank question a candidate got wrong or left blank,
-- kept until they say they understand it.
--
-- One row per (account, learner profile, question). Two states:
--   to_review  — collected automatically by the quiz engine (Quiz.jsx)
--   understood — the candidate clicked « J'ai compris »; the row stays as
--                history and can be put back with « Remettre à revoir ».
-- Getting an understood question wrong again in a later quiz sends it back to
-- to_review and sets `relapsed`, so the history never claims an understanding
-- the last quiz just contradicted.
--
-- Not question_attempts: that table is admin-read only, has no profile, and is
-- meant to aggregate everyone's answers for the difficulty stats.
--
-- Written straight from the browser under RLS (no serverless function: the
-- Vercel plan has none to spare). Collection goes through notebook_record()
-- so a whole quiz's mistakes land in one round trip and the counter is
-- incremented in the database rather than read-modified-written.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

create table if not exists public.mistake_notebook (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid references public.learner_profiles (id) on delete cascade,
  question_id text not null,              -- bank question id (file-derived, not a FK)
  section text,                           -- co | ce
  status text not null default 'to_review' check (status in ('to_review', 'understood')),
  times_wrong int not null default 1,
  last_choice smallint,                   -- option index picked last time; null = left blank
  relapsed boolean not null default false,
  last_wrong_at timestamptz not null default now(),
  understood_at timestamptz,
  created_at timestamptz not null default now(),
  -- NULLS NOT DISTINCT: accounts without a profile still get one row per question.
  constraint mistake_notebook_unique unique nulls not distinct (user_id, profile_id, question_id)
);

create index if not exists mistake_notebook_owner_idx
  on public.mistake_notebook (user_id, profile_id, status, last_wrong_at desc);

alter table public.mistake_notebook enable row level security;
grant select, insert, update, delete on public.mistake_notebook to authenticated;

-- Own rows only, and a profile can only be one of the account's own.
drop policy if exists "notebook: own" on public.mistake_notebook;
create policy "notebook: own" on public.mistake_notebook
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (profile_id is null or exists (
      select 1 from public.learner_profiles lp where lp.id = profile_id and lp.user_id = auth.uid()
    ))
  );

-- Adds a finished quiz's mistakes. p_items = [{ "q": question id, "s": section,
-- "c": option index or null }]. SECURITY INVOKER, so the policy above applies.
create or replace function public.notebook_record(p_profile uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or jsonb_typeof(p_items) <> 'array' then return; end if;
  insert into public.mistake_notebook as m (user_id, profile_id, question_id, section, last_choice)
  select distinct on (x->>'q') auth.uid(), p_profile, left(x->>'q', 200), left(x->>'s', 4), (x->>'c')::smallint
    from (select x from jsonb_array_elements(p_items) x limit 200) items
   where coalesce(x->>'q', '') <> ''
  on conflict on constraint mistake_notebook_unique do update
    set times_wrong   = m.times_wrong + 1,
        last_choice   = excluded.last_choice,
        last_wrong_at = now(),
        relapsed      = m.relapsed or m.status = 'understood',
        status        = 'to_review',
        understood_at = null;
end $$;

grant execute on function public.notebook_record(uuid, jsonb) to authenticated;
