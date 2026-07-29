-- Testimonials ("Histoires de réussite"): success stories written by members,
-- moderated by an admin, then shown on the public landing page. Run in the
-- Supabase dashboard (SQL Editor) or via `supabase db push`. Idempotent.
--
-- Trust model: a member may only ever create a row that is theirs and PENDING —
-- there is no UPDATE policy for members, so nobody can approve their own story
-- or edit one after review. Approval is admin-only; logged-out visitors read
-- approved rows only.

-- is_admin() ships with earlier migrations; redeclared here (owner-inclusive,
-- matching 20260722_owner_role.sql) so this migration stands alone without
-- narrowing the gate back to admin-only.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

create table if not exists public.testimonials (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  -- Immigration route, e.g. "Casablanca → Montréal".
  origin text check (origin is null or char_length(origin) <= 80),
  -- Result claimed, e.g. "C1 obtenu".
  level text check (level is null or char_length(level) <= 40),
  body text not null check (char_length(body) between 40 and 600),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- Featured stories lead the landing-page grid.
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

-- Serves the landing page (approved, featured first) and the moderation queue.
create index if not exists testimonials_status_idx on public.testimonials (status, featured desc, created_at desc);
create index if not exists testimonials_user_idx on public.testimonials (user_id);

alter table public.testimonials enable row level security;

grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

-- Anyone may read approved stories; a member also sees their own while it waits
-- in the queue (so the profile page can show "en attente"), and admins see all.
drop policy if exists "testimonials: read approved or own" on public.testimonials;
create policy "testimonials: read approved or own" on public.testimonials
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());

-- A member may submit their own story, and only as pending. Pinning both
-- user_id and status here is what stops a self-approved testimonial.
drop policy if exists "testimonials: member submit" on public.testimonials;
create policy "testimonials: member submit" on public.testimonials
  for insert with check (user_id = auth.uid() and status = 'pending' and featured = false);

-- Moderation (approve / reject / feature) is admin-only: no member UPDATE policy
-- exists, so a submitted story is immutable to its author.
drop policy if exists "testimonials: admin update" on public.testimonials;
create policy "testimonials: admin update" on public.testimonials
  for update using (public.is_admin());

-- An author may withdraw their own story; admins may remove any.
drop policy if exists "testimonials: delete own or admin" on public.testimonials;
create policy "testimonials: delete own or admin" on public.testimonials
  for delete using (user_id = auth.uid() or public.is_admin());

-- Seed the three original stories (previously hard-coded in constants/home.js)
-- as approved and featured, so the landing page keeps showing them. user_id is
-- null: they predate accounts. Re-running this migration will not duplicate
-- them.
insert into public.testimonials (user_id, name, origin, level, body, status, featured, reviewed_at)
select * from (values
  (null::uuid, 'Amira B.', 'Casablanca → Montréal', 'C1 obtenu',
   'En 8 semaines, je suis passée de B1 à C1 en compréhension orale. Les TCF blancs m''ont enlevé tout le stress le jour J.',
   'approved', true, now()),
  (null::uuid, 'Diego M.', 'Bogotá → Québec', 'B2 obtenu',
   'Le suivi de progression m''a montré exactement où je perdais des points. J''ai obtenu les 50 points d''Entrée express qu''il me fallait.',
   'approved', true, now()),
  (null::uuid, 'Lan N.', 'Hanoï → Ottawa', 'B2 obtenu',
   'Les cartes de vocabulaire quotidiennes et la série de jours d''étude m''ont gardée motivée jusqu''à l''examen.',
   'approved', true, now())
) as seed (user_id, name, origin, level, body, status, featured, reviewed_at)
where not exists (select 1 from public.testimonials where testimonials.name = seed.name);
