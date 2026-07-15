-- Admin dashboard backing tables. Run in the Supabase dashboard (SQL Editor)
-- or via `supabase db push`. Idempotent.
--
-- 1. contact_messages: real inbox behind the public contact form. Anyone may
--    write one (a contact form must accept visitors; the CHECK constraints
--    bound the payload so anonymous spam can't store megabytes) — only admins
--    can read, triage or delete them.
-- 2. admin_audit_log: append-only trail of privileged actions (plan changes,
--    role grants, user deletions). Written exclusively by the server-side
--    admin API (service role) so an admin can't quietly edit their own trail;
--    admins can read it from the dashboard.

-- is_admin() normally ships with 20260708_questions.sql; redeclared here
-- (identical) so this migration stands alone on a database where the QMS
-- migration hasn't been applied yet.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ── 1. contact messages ─────────────────────────────────────────────────────
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  subject text check (subject is null or char_length(subject) <= 200),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'new' check (status in ('new', 'resolved', 'archived')),
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_status_idx on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "messages: anyone insert" on public.contact_messages;
create policy "messages: anyone insert" on public.contact_messages
  for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists "messages: admin read" on public.contact_messages;
create policy "messages: admin read" on public.contact_messages
  for select using (public.is_admin());
drop policy if exists "messages: admin update" on public.contact_messages;
create policy "messages: admin update" on public.contact_messages
  for update using (public.is_admin());
drop policy if exists "messages: admin delete" on public.contact_messages;
create policy "messages: admin delete" on public.contact_messages
  for delete using (public.is_admin());

-- ── 2. admin audit log ──────────────────────────────────────────────────────
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,          -- set-plan | set-role | delete-user | …
  target text,                   -- affected user's email (or other identifier)
  detail jsonb,                  -- action-specific payload (plan, months, role…)
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_date_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

-- Read-only for admins; no insert/update/delete policies on purpose — only
-- the service role (api/admin/*) writes here, and nobody edits history.
drop policy if exists "audit: admin read" on public.admin_audit_log;
create policy "audit: admin read" on public.admin_audit_log
  for select using (public.is_admin());
