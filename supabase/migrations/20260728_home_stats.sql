-- Home "chiffres clés" band: the admin-editable statistics strip on the public
-- landing page, stored as one JSON row in the existing site_settings key/value
-- store (see 20260721_site_settings.sql for the table, grants and RLS — public
-- read, admin write). Run in the Supabase dashboard (SQL Editor) or via
-- `supabase db push`. Idempotent.
--
-- The row is seeded empty on purpose: settingsService.getHomeStats() reads a
-- blank value as "nothing customised yet" and falls back to HOME_STATS_DEFAULT
-- (constants/home.js), which counts the shipped content live. The first admin
-- save replaces it with { enabled, items: [{ src, n, l }] }.
--
-- `src` values: questions | series | exercises (counted live in the browser),
-- users | quizzes | exams (snapshots published from the live database via
-- Admin › Accueil › Chiffres clés › « Actualiser depuis le site »), manual.

insert into public.site_settings (key, value) values ('home_stats', '')
  on conflict (key) do nothing;
