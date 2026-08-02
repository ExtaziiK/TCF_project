-- Star ratings on testimonials, so the TCF blanc can ask for feedback the
-- moment a candidate finishes one.
--
-- Extends 20260729_testimonials rather than adding a second table: an "avis"
-- and a "témoignage" are the same object here — a member's opinion, moderated
-- by an admin before the public sees it. Splitting them would have meant two
-- moderation queues for one job.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

alter table public.testimonials
  add column if not exists rating smallint check (rating is null or rating between 1 and 5);

-- Nullable on purpose: the three seeded stories and anything submitted through
-- the older long-form story page have no rating, and inventing one for them
-- would put words in their authors' mouths.

-- The body minimum was 40 characters, which suits a written success story but
-- not a rating left in the seconds after an exam ("Très bon entraînement,
-- merci !" is 32). Lowering the floor cannot invalidate an existing row.
alter table public.testimonials drop constraint if exists testimonials_body_check;
alter table public.testimonials
  add constraint testimonials_body_check check (char_length(body) between 10 and 600);

-- The avis page reads approved rows newest-first and shows the rating; the
-- existing status index already covers featured-first for the landing page.
create index if not exists testimonials_rating_idx
  on public.testimonials (status, created_at desc)
  where rating is not null;
