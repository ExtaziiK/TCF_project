-- "Publier sans mon nom" — a member may leave a review without their name
-- reaching the public avis page, while the moderation queue still shows an
-- admin who actually wrote it.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

-- The flag itself. Deliberately public: it carries no identity, and the
-- moderation queue reads it to mark a row as "nom masqué à sa demande".
alter table public.testimonials
  add column if not exists anonymous boolean not null default false;

-- Where the real name goes when that flag is set.
--
-- `testimonials.name` is readable by anyone the moment a row is approved — the
-- read policy in 20260729 is row-level, and RLS cannot hide a single column of
-- a row it lets you read. Blanking the name in the UI alone would still ship it
-- to every visitor's browser, one devtools panel away from being un-hidden.
--
-- So the name a member asked us to hide never enters that table at all:
-- `name` receives the public label, and the real one is written here, in a
-- table the anon key is not even granted select on.
create table if not exists public.testimonial_identities (
  testimonial_id bigint primary key references public.testimonials (id) on delete cascade,
  real_name text not null check (char_length(real_name) between 1 and 60),
  created_at timestamptz not null default now()
);

alter table public.testimonial_identities enable row level security;

-- Note what is missing: `anon` entirely, and update/delete for everyone. A real
-- name is written once by its owner and read only by moderation. Removing a
-- review takes its identity with it through the cascade above, so there is no
-- path that leaves an orphaned name behind.
grant select, insert on public.testimonial_identities to authenticated;

drop policy if exists "identities: admin read" on public.testimonial_identities;
create policy "identities: admin read" on public.testimonial_identities
  for select using (public.is_admin());

-- The author of the matching review, and only for their own. The subquery runs
-- under the member's own RLS, which already lets them see their pending row.
drop policy if exists "identities: author writes own" on public.testimonial_identities;
create policy "identities: author writes own" on public.testimonial_identities
  for insert with check (
    exists (
      select 1 from public.testimonials t
      where t.id = testimonial_id and t.user_id = auth.uid()
    )
  );
