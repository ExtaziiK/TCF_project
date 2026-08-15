-- Dictée: sense groups, a daily seeding rhythm, and the listening length.
--
-- Three changes, one feature. Read 20260811_dictee.sql first — it explains why
-- dictee_texts is a shared, server-only cache rather than user content.
--
-- 1. GROUPS. The dictation used to be read one SENTENCE at a time, and the
--    sentences of a C1/C2 model answer run to twenty-odd words — long enough
--    that the exercise measured short-term memory rather than French. It is now
--    read in groupes de sens (api/_lib/dictee.js → splitGroups), the stretch a
--    teacher breathes between, and the candidate chooses how many of them they
--    hear at a time.
--
--    The groups are recorded ONCE, at the finest granularity, and every longer
--    setting is built in the browser by playing consecutive recordings back to
--    back (src/utils/dicteeSegments.js). That is deliberate and it is what
--    makes the setting free: recording each length separately would have
--    tripled both the Azure bill and — the real constraint — the base64 sitting
--    in this table, which at full seeding is already ~430 MB.
--
--    `sentences` and `audio` are left exactly as they are. They are the old
--    unit and the old recordings; nothing reads them any more, but dropping a
--    NOT NULL column that rows still depend on buys nothing and a row whose
--    groups are null is simply re-synthesized on next draw, the same way a row
--    with no audio always was.
--
-- 2. featured_on. Which day this text was the dictée du jour. Set by the cron
--    (api/cron/dictee-seed.js), null for texts generated on demand, and the
--    only thing that distinguishes today's three from the rest of the library.
--
-- 3. segment_mode on dictee_sessions. Shorter segments are an easier dictée, so
--    a score is only comparable to another score taken at the same setting —
--    without this column the "meilleur score" on the intro would happily rank a
--    Débutant run above an Examen one.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

/* ------------------------------ dictee_texts ------------------------------ */

alter table public.dictee_texts
  -- ["<groupe de sens>", ...] in reading order. Joining them with single
  -- spaces reproduces `text` exactly; the correction is scored against that
  -- join, so anything that breaks the property scores candidates against a
  -- text nobody read to them.
  add column if not exists groups jsonb,
  -- ["<base64 mp3>", ...], index-aligned with `groups`. Null until first
  -- synthesized; null again is harmless (re-synthesized on demand).
  add column if not exists groups_audio jsonb,
  add column if not exists featured_on date;

-- The dictée du jour lookup, and the "how many were generated today" count
-- that caps the daily spend. Both are tiny scans today; the index keeps them
-- tiny once the library holds all 1 428 (sujet, tâche) pairs.
create index if not exists dictee_texts_featured_idx
  on public.dictee_texts (featured_on desc)
  where featured_on is not null;

create index if not exists dictee_texts_created_idx
  on public.dictee_texts (created_at desc);

/* ----------------------------- dictee_sessions ---------------------------- */

alter table public.dictee_sessions
  -- 'court' | 'moyen' | 'phrase' — the ids in src/utils/dicteeSegments.js.
  -- Nullable: sessions recorded before this column existed were all taken at
  -- one sentence per unit, which is what 'phrase' means, but they are left
  -- null rather than backfilled with a guess about how someone practised.
  add column if not exists segment_mode text;
