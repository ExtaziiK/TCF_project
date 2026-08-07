-- Tell a DZD buyer where their payment stands.
--
-- Until now the only feedback was the confirmation screen shown once, right
-- after submitting: reload the page and every trace was gone. A buyer waiting
-- for validation had no way to check their request existed, and a buyer whose
-- receipt was REFUSED was told nothing at all — no message, no status, no
-- reason. They simply waited, then wrote in.
--
-- The reason is what makes a refusal actionable: "receipt unreadable" lets
-- someone send a better photo, where silence only produces a support message.
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Safe to re-run.

alter table public.subscription_requests
  add column if not exists review_note text check (review_note is null or char_length(review_note) <= 300),
  add column if not exists reviewed_at timestamptz;

-- The buyer reads their own row through the existing "subreq: own read" policy,
-- so the note reaches them with no new policy and no endpoint. Only an admin
-- can write it ("subreq: admin update"), which is already in place.
--
-- Nothing is backfilled: requests settled before this migration have no reason
-- on record, and inventing one would put words in a reviewer's mouth.
