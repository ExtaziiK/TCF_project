-- DZD subscription requests now collect a phone number so the owner can reach
-- the buyer about their payment. The checkout makes it required going forward;
-- the column stays nullable so older rows (and the WhatsApp path) remain valid.
-- Idempotent — safe to re-run.

alter table public.subscription_requests
  add column if not exists phone text;
