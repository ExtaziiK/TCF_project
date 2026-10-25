-- One model answer per Expression écrite (subject, tâche), used everywhere.
--
-- sujets_answers already holds the « modèle de réponse » of each subject. From
-- now on that row is THE text for the subject: the Modèle de réponse page shows
-- it, the writing workshop shows it as its « Exemple de réponse », and the
-- dictée reads it aloud. These columns record what the quality gate checked
-- before it was published (api/_lib/eeModelAnswer.js), and tie each dictée to
-- the answer it was read from.
--
-- Idempotent: safe to paste into the SQL editor more than once. Requires
-- 20260913_sujets_answers.sql and 20260811_dictee.sql (both applied).

alter table public.sujets_answers
  -- A title for an article, blog post or tâche 3 text; typed into the exam box,
  -- so counted in `words`. Empty for a message.
  add column if not exists title text not null default '',
  -- Counted like the exam's counter (runs of non-space characters), title included.
  add column if not exists words smallint,
  -- The grade our own Expression écrite grader gave this text (/20), and its
  -- five criteria — the bar a model answer must clear: 16 overall, 14 each.
  add column if not exists score smallint,
  add column if not exists criteria jsonb,
  -- 1 = written before the quality gate existed (not graded); 2 = written,
  -- measured, proofread and graded by the gate.
  add column if not exists version smallint not null default 1;

alter table public.dictee_texts
  -- The model answer this dictée was read from. Null on texts the dictée wrote
  -- for itself before the two were unified: those stay playable (and every
  -- score taken on them stays in dictee_sessions) until the subject's model
  -- answer replaces them.
  add column if not exists answer_id uuid references public.sujets_answers (id) on delete set null;

create index if not exists dictee_texts_answer_idx on public.dictee_texts (answer_id);
