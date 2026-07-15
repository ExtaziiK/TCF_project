-- Usage tracking for the admin dashboard. Run in the Supabase dashboard
-- (SQL Editor) or via `supabase db push`. Idempotent.
--
-- 1. ai_usage_log: one row per Groq call (chat evaluation or Whisper
--    transcription), written by the expression endpoints with the service
--    role. Groq has no usage API to query, so we are our own meter: the
--    admin dashboard aggregates calls, tokens and audio volume from here.
-- 2. admin_platform_usage(): database size + per-bucket storage totals,
--    measured from inside the project so the dashboard can show consumption
--    against the Supabase plan limits. SECURITY DEFINER because
--    pg_database_size and storage.objects aren't readable by ordinary roles;
--    execution is service-role only.

-- ── 1. AI usage log ─────────────────────────────────────────────────────────
create table if not exists public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  endpoint text not null,        -- expression-ecrite | expression-orale
  kind text not null,            -- chat | transcription
  model text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  audio_bytes int,               -- transcription only: size of the clip sent
  duration_ms int,               -- wall time of the Groq call
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_log_date_idx on public.ai_usage_log (created_at desc);
create index if not exists ai_usage_log_user_idx on public.ai_usage_log (user_id, created_at desc);

alter table public.ai_usage_log enable row level security;

-- Admins may read (dashboard); writes come only from the service role — no
-- insert policy on purpose, a client can't fabricate usage rows.
drop policy if exists "ai usage: admin read" on public.ai_usage_log;
create policy "ai usage: admin read" on public.ai_usage_log
  for select using (public.is_admin());

-- ── 2. platform usage probe ─────────────────────────────────────────────────
create or replace function public.admin_platform_usage()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket_id, 'bytes', total, 'files', files) order by total desc)
      from (
        select bucket_id, sum(coalesce((metadata ->> 'size')::bigint, 0)) as total, count(*) as files
        from storage.objects
        group by bucket_id
      ) s
    ), '[]'::jsonb)
  );
$$;
revoke execute on function public.admin_platform_usage() from public, anon, authenticated;
grant execute on function public.admin_platform_usage() to service_role;
