-- Lets an admin override how many days a gift link's plan lasts, instead of
-- always defaulting to the plan's own duration (Starter 15 / Pro 30 /
-- Ultimate 90 — api/_lib/passes.js). NULL keeps that default; a link created
-- before this migration reads as NULL, so nothing existing changes behaviour.
-- See api/_lib/public/gift.js (redemption: `link.days || PASSES[slug].days`)
-- and api/_lib/admin/giftLinks.js (validation, on create only — a link's
-- duration cannot be edited after accounts have already redeemed it at that
-- length, only a new link can offer a different one).
--
-- Run in the Supabase dashboard (SQL Editor) or via `supabase db push`.
-- Idempotent — safe to re-run.

alter table public.gift_links add column if not exists days int check (days is null or days > 0);
