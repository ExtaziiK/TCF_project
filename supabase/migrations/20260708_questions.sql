-- Question Management System: admin-authored questions + version history.
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
--
-- `payload` is a jsonb document whose shape is described per-section in
-- src/constants/questionSchema.js — new sections and new fields require no
-- schema change here.

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  section text not null,              -- co | ce | eo | ee | grammar | vocab | future sections
  task int,                           -- Tâche 1..3 for sections that have tasks
  difficulty text not null default 'B1',
  status text not null default 'active' check (status in ('active', 'disabled', 'archived')),
  tags text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create table if not exists public.question_versions (
  id bigint generated always as identity primary key,
  question_id uuid not null references public.questions (id) on delete cascade,
  version int not null,
  section text,
  task int,
  difficulty text,
  status text,
  tags text[],
  payload jsonb not null,
  edited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (question_id, version)
);

create index if not exists questions_section_idx on public.questions (section, status);
create index if not exists questions_updated_idx on public.questions (updated_at desc);

alter table public.questions enable row level security;
alter table public.question_versions enable row level security;

-- is_admin() from the JWT app_metadata (clients cannot self-edit it).
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Everyone (including anonymous practice pages) can read ACTIVE questions;
-- admins can read everything and are the only writers.
create policy "questions: read active" on public.questions
  for select using (status = 'active' or public.is_admin());
create policy "questions: admin insert" on public.questions
  for insert with check (public.is_admin());
create policy "questions: admin update" on public.questions
  for update using (public.is_admin());
create policy "questions: admin delete" on public.questions
  for delete using (public.is_admin());

create policy "versions: admin read" on public.question_versions
  for select using (public.is_admin());
create policy "versions: admin insert" on public.question_versions
  for insert with check (public.is_admin());

-- Media uploads from the QMS editor go to the existing Audio / Image storage
-- buckets under the admin/ prefix. If uploads are refused, add storage
-- policies like these (Dashboard -> Storage -> Policies):
--
--   create policy "admin upload audio" on storage.objects
--     for insert with check (bucket_id = 'Audio' and public.is_admin());
--   create policy "admin upload image" on storage.objects
--     for insert with check (bucket_id = 'Image' and public.is_admin());
