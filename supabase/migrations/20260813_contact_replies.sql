-- Replies to contact messages, delivered inside the member's account.
--
-- Until now a message was a one-way street: the admin could triage it, and the
-- only way to answer was the mailto: link in the dashboard — an answer sent
-- from whatever mail client the machine happened to have, recorded nowhere.
-- This table is the other direction, and the first thing on the platform that
-- the site itself sends TO a member (the nav bell was until now derived
-- entirely from the member's own progress, client-side).
--
-- Delivery is by ACCOUNT, never by the email typed in the form: a reply is
-- readable by whoever owns contact_messages.user_id, which the insert policy
-- already pins to auth.uid(). A visitor who wrote without an account
-- (user_id null) is unreachable here by construction and is answered by email
-- instead — the admin UI says which of the two happened.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

-- is_admin() ships with earlier migrations; redeclared here (owner-inclusive,
-- matching 20260722_owner_role.sql) so this migration stands alone.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.contact_replies (
  id bigint generated always as identity primary key,
  message_id bigint not null references public.contact_messages (id) on delete cascade,
  -- Same ceiling as the message it answers (contact_messages.message).
  body text not null check (char_length(body) between 1 and 4000),
  -- Who answered. Kept for the audit trail; never shown to the member, who
  -- sees the reply as coming from the team.
  sent_by uuid references auth.users (id) on delete set null,
  sent_by_email text,
  -- Whether a copy also went out by email, so the thread shows what the
  -- member actually received rather than what we hoped they received.
  emailed boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists contact_replies_message_idx on public.contact_replies (message_id, created_at desc);
-- The bell asks "anything unread for me?" on every page load; partial index so
-- that question stays cheap as the table grows.
create index if not exists contact_replies_unread_idx on public.contact_replies (message_id) where read_at is null;
-- Backs the member's own thread list (contact_messages by owner).
create index if not exists contact_messages_user_idx on public.contact_messages (user_id, created_at desc);

alter table public.contact_replies enable row level security;

-- Written exclusively by the server-side admin API with the service role, like
-- admin_audit_log: no insert or delete policy exists, so nothing a browser
-- sends can fabricate a reply from the team.
grant select on public.contact_replies to authenticated;
revoke insert, update, delete on public.contact_replies from anon, authenticated;
-- The one column a member may write, and only on their own reply: marking it
-- read. A policy alone could not express that — RLS gates rows, not columns —
-- so the column privilege is what stops a member from rewriting the answer
-- they were given.
grant update (read_at) on public.contact_replies to authenticated;

-- A member reads the answers to their own messages; an admin reads all of them
-- for the dashboard thread. The exists() is itself filtered by
-- contact_messages' RLS, so it can only ever match a row the caller may see.
drop policy if exists "replies: read own or admin" on public.contact_replies;
create policy "replies: read own or admin" on public.contact_replies
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.contact_messages m
      where m.id = contact_replies.message_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "replies: mark own read" on public.contact_replies;
create policy "replies: mark own read" on public.contact_replies
  for update to authenticated using (
    exists (
      select 1 from public.contact_messages m
      where m.id = contact_replies.message_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.contact_messages m
      where m.id = contact_replies.message_id and m.user_id = auth.uid()
    )
  );

-- Members could write a message but never read it back (the table was
-- admin-read only). Seeing your own thread is the point of the whole feature,
-- and it is also what makes the exists() above resolve.
drop policy if exists "messages: select own" on public.contact_messages;
create policy "messages: select own" on public.contact_messages
  for select to authenticated using (user_id = auth.uid());
