-- The subjects archive is for signed-in accounts only.
--
-- 20260728_sujets_archive.sql opened sujets_archive to everyone ("sujets:
-- public read", select granted to anon) because the archive pages were meant
-- to be public and indexed. They are now behind an account, like the shipped
-- archive files (moved out of public/ and served by /api/public/sujets to
-- signed-in users only): an anonymous visitor must not be able to read the
-- admin-added months straight from the API either.
--
-- Admin write policies are untouched.

revoke select on public.sujets_archive from anon;
grant select on public.sujets_archive to authenticated;

drop policy if exists "sujets: public read" on public.sujets_archive;
drop policy if exists "sujets: signed-in read" on public.sujets_archive;
create policy "sujets: signed-in read" on public.sujets_archive
  for select to authenticated using (true);
