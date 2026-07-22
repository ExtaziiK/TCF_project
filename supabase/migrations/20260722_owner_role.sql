-- Owner role — a super-admin that has every admin capability plus the
-- exclusive right to promote/demote admins (enforced in api/admin/users).
--
-- The RLS gate is_admin() previously matched only role = 'admin', which would
-- lock an owner out of every admin-only table/policy (questions, audit log,
-- site_settings, …). Widen it to accept 'owner' too, so an owner is a strict
-- superset of an admin at the database layer as well as in the app.
--
-- app_metadata.role is signed into the JWT by Supabase Auth and cannot be
-- self-edited from the client, so this stays server-controlled.

create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;
