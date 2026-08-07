-- Give every NEW account its default profile.
--
-- 20260804_learner_profiles backfilled one profile per account that existed
-- when it ran, and stopped there. Anyone signing up afterwards — by email or
-- through Google, the trigger does not care — got none, and that is a dead end
-- rather than a cosmetic gap: the chooser only appears when the account already
-- has at least one profile, so a new Première classe or VIP buyer had no way to
-- reach it and no way to create their first profile.
--
-- Their exam attempts and quiz results were also being written with a null
-- profile_id, so history recorded before a profile existed would not have
-- belonged to any.
--
-- Mirrors handle_new_user() from 20260709_profiles_and_login: a trigger on
-- auth.users covers every sign-up path at once, including OAuth, where no code
-- of ours runs at account creation.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

create or replace function public.handle_new_learner_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Named from what the account will be called on screen. Google supplies
  -- `name`; the email form sets it too, so both land on something human before
  -- falling back.
  insert into public.learner_profiles (user_id, name)
  values (
    new.id,
    left(coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
      'Profil 1'
    ), 30)
  )
  on conflict do nothing;  -- a re-run, or a profile created some other way
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_learner_profile();

-- Accounts created between the first profiles migration and this trigger have
-- no profile at all. Same insert as the original backfill, so re-running is
-- harmless.
insert into public.learner_profiles (user_id, name)
select u.id,
       left(coalesce(
         nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
         nullif(btrim(p.username), ''),
         'Profil 1'
       ), 30)
  from auth.users u
  left join public.profiles p on p.id = u.id
 where not exists (select 1 from public.learner_profiles lp where lp.user_id = u.id);

-- And attach any history those accounts recorded while they had none, so a
-- profile created now does not start with a blank slate the candidate earned.
update public.exam_attempts a
   set profile_id = (select lp.id from public.learner_profiles lp
                      where lp.user_id = a.user_id order by lp.created_at limit 1)
 where a.profile_id is null;

update public.quiz_results q
   set profile_id = (select lp.id from public.learner_profiles lp
                      where lp.user_id = q.user_id order by lp.created_at limit 1)
 where q.profile_id is null;
