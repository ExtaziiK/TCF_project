-- Public live count of registered students, for the "Auto · étudiants inscrits"
-- source of the landing-page statistics band (constants/home.js). Run in the
-- Supabase dashboard (SQL Editor) or via `supabase db push`. Idempotent.
--
-- Why an RPC: the band is rendered for logged-out visitors, and the anon key
-- can read neither auth.users nor other people's profiles rows (RLS: "select
-- own"). A security-definer function returns the single aggregate — a number,
-- never a row — so nothing about any individual account is exposed.
--
-- "Students" excludes staff: any account whose app_metadata.role is admin or
-- owner is left out, so the public figure counts real learners only. profiles
-- carries exactly one row per auth user (trigger + backfill in
-- 20260709_profiles_and_login.sql), which makes the join an exact count.

create or replace function public.registered_students_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.profiles p
  join auth.users u on u.id = p.id
  where coalesce(u.raw_app_meta_data ->> 'role', 'user') not in ('admin', 'owner');
$$;

grant execute on function public.registered_students_count() to anon, authenticated;
