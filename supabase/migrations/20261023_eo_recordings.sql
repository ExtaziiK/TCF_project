-- Expression orale: the recording of each tâche, kept so the candidate can
-- listen to themselves afterwards. One audio file per tâche, the whole
-- exchange in order — the examiner's voice and the candidate's answers mixed
-- as the conversation happened (src/hooks/useConversationRecorder.js).
--
--   1. table "eo_recordings" — one row per saved tâche (metadata + file path)
--   2. storage bucket "eo-recordings" — the audio files, private, one folder
--      per account (<user id>/<file>)
--
-- Written straight from the browser under RLS (no serverless function: the
-- Vercel plan has none to spare). The page keeps the newest 30 per account and
-- deletes older ones (eoRecordingsService.js); a candidate can delete any of
-- theirs. When an account is deleted, the rows go with it (on delete cascade)
-- and the files are removed by the deletion itself (api/_lib/eoRecordings.js),
-- since storage objects don't cascade.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

create table if not exists public.eo_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task smallint not null check (task between 1 and 3),
  task_label text,
  prompt text,                         -- the subject, to know what was answered
  mode text not null default 'practice' check (mode in ('practice', 'exam')),
  storage_path text not null,          -- object path in the "eo-recordings" bucket
  mime text,
  duration_secs int,
  score smallint check (score between 0 and 20),
  created_at timestamptz not null default now()
);

create index if not exists eo_recordings_owner_idx
  on public.eo_recordings (user_id, created_at desc);

alter table public.eo_recordings enable row level security;
grant select, insert, delete on public.eo_recordings to authenticated;

-- Own rows only, and a row may only point into the account's own folder.
drop policy if exists "eo_recordings: own" on public.eo_recordings;
create policy "eo_recordings: own" on public.eo_recordings
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and split_part(storage_path, '/', 1) = auth.uid()::text);

-- The files: private bucket, audio only, 15 MB at most per file (a 4 min 30
-- tâche at the recorder's bitrate is about 1-2 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('eo-recordings', 'eo-recordings', false, 15728640,
          array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- Each account reads, writes and deletes only inside its own folder.
drop policy if exists "eo-recordings: own upload" on storage.objects;
create policy "eo-recordings: own upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'eo-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eo-recordings: own read" on storage.objects;
create policy "eo-recordings: own read" on storage.objects
  for select to authenticated
  using (bucket_id = 'eo-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eo-recordings: own delete" on storage.objects;
create policy "eo-recordings: own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'eo-recordings' and (storage.foldername(name))[1] = auth.uid()::text);
