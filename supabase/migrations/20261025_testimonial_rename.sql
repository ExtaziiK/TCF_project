-- A member's reviews follow their name.
--
-- A review is signed with the first name its author had when posting
-- (testimonials.name, copied at submission). Members have no UPDATE policy on
-- testimonials — deliberately, so nobody can approve their own review — so a
-- first name changed later in the profile never reached their reviews, which
-- stayed signed with the old one.
--
-- This function is the one write a member may make there: rename THEIR OWN
-- reviews, nothing else. A review published without a name (anonymous) keeps
-- its public label; only the real name moderation sees
-- (testimonial_identities) follows. Called by the profile page right after a
-- first name is saved (src/pages/Profile.jsx → renameMyTestimonials).
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

create or replace function public.rename_my_testimonials(p_name text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := left(btrim(coalesce(p_name, '')), 60);
  renamed integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if char_length(clean) < 1 then
    raise exception 'empty name';
  end if;

  update public.testimonials
     set name = clean
   where user_id = auth.uid()
     and anonymous is not true;
  get diagnostics renamed = row_count;

  update public.testimonial_identities ti
     set real_name = clean
    from public.testimonials t
   where t.id = ti.testimonial_id
     and t.user_id = auth.uid();

  return renamed;
end;
$$;

revoke all on function public.rename_my_testimonials(text) from public, anon;
grant execute on function public.rename_my_testimonials(text) to authenticated;
