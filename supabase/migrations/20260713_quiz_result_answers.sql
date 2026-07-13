-- Per-question answer detail for standalone practice-quiz attempts, so a
-- previous attempt can be reopened and reviewed question-by-question (right /
-- wrong / skipped, with the explanation) instead of just the aggregate score.
-- Shape: [{ "i": 0, "sel": 2, "ok": true }, ...] — one entry per answered
-- question, "i" indexing into the quiz's question array; skipped questions
-- are simply absent from the array.
-- Nullable: rows recorded before this column existed carry no detail, and
-- the UI falls back to showing the score only for those attempts.
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.

alter table public.quiz_results add column if not exists answers jsonb;
