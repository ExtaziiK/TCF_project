-- « Mon lexique » — each learner's personal vocabulary deck, reviewed with
-- spaced repetition (src/utils/srs.js: five Leitner boxes, 1/3/7/16/35 days).
--
-- Words come in from the vocabulary page (a card, or a word missed in a quiz or
-- an exercise) and from the « Expressions à mémoriser » of the model answers.
-- Until this is applied the app keeps the deck in the browser instead
-- (src/services/vocabDeckService.js), so nothing breaks — it just does not
-- follow the learner across devices.
--
-- Idempotent: safe to paste into the SQL editor more than once.

create table if not exists public.vocab_deck (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid references public.learner_profiles (id) on delete cascade,
  -- The word or expression, and its normalised form (lower case, one kind of
  -- apostrophe, single spaces) that makes « En revanche » and « en revanche »
  -- the same card.
  term text not null check (char_length(term) between 1 and 160),
  term_key text not null check (char_length(term_key) between 1 and 160),
  def text not null default '' check (char_length(def) <= 600),
  example text not null default '' check (char_length(example) <= 600),
  -- vocab | mot-precis | connecteur | modele
  source text not null default 'vocab' check (char_length(source) <= 20),
  box smallint not null default 1 check (box between 1 and 5),
  due_at timestamptz not null default now(),
  reviews int not null default 0,
  lapses int not null default 0,
  created_at timestamptz not null default now(),
  -- One card per term per learner; NULLS NOT DISTINCT so accounts without a
  -- learner profile get one too.
  constraint vocab_deck_unique unique nulls not distinct (user_id, profile_id, term_key)
);

create index if not exists vocab_deck_owner_idx
  on public.vocab_deck (user_id, profile_id, due_at);

alter table public.vocab_deck enable row level security;
revoke all on public.vocab_deck from anon;
grant select, insert, update, delete on public.vocab_deck to authenticated;

-- Own rows only, and a profile can only be one of the account's own.
drop policy if exists "vocab deck: own" on public.vocab_deck;
create policy "vocab deck: own" on public.vocab_deck
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (profile_id is null or exists (
      select 1 from public.learner_profiles lp where lp.id = profile_id and lp.user_id = auth.uid()
    ))
  );
