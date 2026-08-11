-- Dictée (Expression écrite) — two tables, two very different jobs.
--
-- dictee_texts is a SHARED CACHE, not user content. The sujets archive holds
-- 476 sujets × 3 tâches of prompts and not a single model answer, so the text
-- a candidate takes down under dictation has to be written by the AI the first
-- time that (sujet, tâche) is ever drawn. Writing it again for the next
-- candidate would cost a second Groq call, a second Azure synthesis, and —
-- worse — would hand two people practising "the same" dictée two different
-- texts and two incomparable scores. So the model answer and its per-sentence
-- audio are written once and reused by everyone, forever.
--
-- Audio lives in the row as base64 rather than in Storage: it arrives from
-- Azure as one small mp3 per sentence (~15-40 KB), it is only ever read back
-- through api/dictee.js, and keeping it here means the cache has exactly one
-- home to check, one thing to expire, and no bucket to provision. `audio` is
-- filled lazily and may be null — a row whose text exists but whose audio does
-- not is re-synthesized on the next draw.
--
-- No RLS policies at all on dictee_texts: it is server-only. The browser never
-- selects from it (that would hand out the answer key before the dictation),
-- so the service-role key is the only thing that may read or write it.
--
-- dictee_sessions is ordinary user history — one row per completed dictée,
-- read by the dashboard through progressService, owner-scoped like
-- quiz_results.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

/* ------------------------- shared text + audio cache ---------------------- */

create table if not exists public.dictee_texts (
  id uuid primary key default gen_random_uuid(),
  -- "<year>-<monthNum>-<n>", the sujet's coordinates in the EE archive.
  sujet_key text not null,
  task smallint not null check (task between 1 and 3),
  -- The register the model answer was written at. Kept per row because the
  -- generator is asked for C1 on tâche 1-2 and C2 on tâche 3, and a future
  -- change to that rule must not silently reinterpret rows already cached.
  level text not null default 'C1',
  prompt text,
  text text not null,
  -- The same text, pre-split into the sentences the candidate types one at a
  -- time. Stored rather than re-derived so a change to the splitter can never
  -- desynchronize a cached sentence from the audio recorded for it.
  sentences jsonb not null,
  -- ["<base64 mp3>", ...], index-aligned with `sentences`. Null until first
  -- synthesized; null again is harmless (re-synthesized on demand).
  audio jsonb,
  words smallint,
  created_at timestamptz not null default now(),
  unique (sujet_key, task)
);

alter table public.dictee_texts enable row level security;
-- No grants, no policies: service role only. Deliberate — see header.
revoke all on public.dictee_texts from anon, authenticated;

/* ------------------------------ user history ------------------------------ */

create table if not exists public.dictee_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Matches quiz_results and exam_attempts: accounts with learner profiles
  -- scope their history per profile, accounts without one leave this null.
  -- The cascade matters — listDicteeSessions filters on profile_id, so a row
  -- left pointing at a deleted profile would be invisible for ever rather than
  -- merely unscoped.
  profile_id uuid references public.learner_profiles (id) on delete cascade,
  -- The cache row this session was taken from. `on delete set null` so pruning
  -- the cache never destroys someone's score history.
  dictee_id uuid references public.dictee_texts(id) on delete set null,
  sujet_key text,
  task smallint,
  sentences smallint not null,
  words smallint not null,
  -- Words reproduced exactly, accents included. `score` is the percentage of
  -- those over `words`; stored rather than computed so the number a candidate
  -- was shown never moves when the scoring rules are tuned.
  correct smallint not null,
  accent_errors smallint not null default 0,
  score smallint not null,
  -- Total plays across the dictée and the playback rate chosen. Both are
  -- feedback in their own right: 90 % at 0.6× with four listens per sentence
  -- is a different result from 90 % at 1× with one.
  plays smallint,
  speed numeric(3, 2),
  duration_sec integer,
  -- { homophone: 4, accent: 3, plural: 2, ... } — the error families from
  -- src/utils/dicteeDiff.js, kept so the dashboard can show what a candidate
  -- gets wrong ACROSS dictées, which one session can never show.
  errors jsonb,
  completed_at timestamptz not null default now()
);

create index if not exists dictee_sessions_user_idx
  on public.dictee_sessions (user_id, completed_at desc);

create index if not exists dictee_sessions_profile_idx
  on public.dictee_sessions (profile_id);

alter table public.dictee_sessions enable row level security;

grant select, insert on public.dictee_sessions to authenticated;

drop policy if exists "dictee sessions: read own" on public.dictee_sessions;
create policy "dictee sessions: read own" on public.dictee_sessions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "dictee sessions: insert own" on public.dictee_sessions;
create policy "dictee sessions: insert own" on public.dictee_sessions
  for insert to authenticated with check (auth.uid() = user_id);

-- No update or delete policy: a score, once recorded, is not editable by the
-- account it belongs to.
