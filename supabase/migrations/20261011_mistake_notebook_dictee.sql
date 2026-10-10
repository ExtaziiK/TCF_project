-- Carnet d'erreurs, part 2: misspelt dictée words.
--
-- A dictée word is not a bank question, so its card carries what the bank
-- would otherwise supply in `detail`:
--   { word, typed, family, sentence, start, end }
-- (the expected spelling, what was written, the error family from
-- src/utils/dicteeDiff.js, and the sentence it was dictated in with the word's
-- offsets, so the card can highlight it in context).
--
-- question_id is "dictee:<word>" (lower case, accents kept, no apostrophe), so
-- misspelling the same word in a later dictée bumps one card's counter instead
-- of adding a second card; the latest sentence and spelling replace the old.
--
-- Run after 20261010_mistake_notebook.sql. Safe to re-run.

alter table public.mistake_notebook add column if not exists detail jsonb;

-- Same as part 1, plus: p_items[].d is stored in `detail`, and sections are
-- no longer cut to 4 characters ("dictee" is 6).
create or replace function public.notebook_record(p_profile uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or jsonb_typeof(p_items) <> 'array' then return; end if;
  insert into public.mistake_notebook as m (user_id, profile_id, question_id, section, last_choice, detail)
  select distinct on (x->>'q') auth.uid(), p_profile, left(x->>'q', 200), left(x->>'s', 10), (x->>'c')::smallint,
         case when jsonb_typeof(x->'d') = 'object' then x->'d' end
    from (select x from jsonb_array_elements(p_items) x limit 200) items
   where coalesce(x->>'q', '') <> ''
  on conflict on constraint mistake_notebook_unique do update
    set times_wrong   = m.times_wrong + 1,
        last_choice   = excluded.last_choice,
        detail        = coalesce(excluded.detail, m.detail),
        last_wrong_at = now(),
        relapsed      = m.relapsed or m.status = 'understood',
        status        = 'to_review',
        understood_at = null;
end $$;

grant execute on function public.notebook_record(uuid, jsonb) to authenticated;
