-- Align production battle_votes/archived_battle_votes with development SuperTip columns
-- Adds: battle_votes.super_tip_amount, battle_votes.stripe_payment_intent_id, battle_votes.payment_status
--       archived_battle_votes.super_tip_amount, archived_battle_votes.stripe_payment_intent_id,
--       archived_battle_votes.payment_status, archived_battle_votes.has_super_tip

BEGIN;

-- battle_votes: add SuperTip-related columns (no defaults; keep nullable for compatibility)
ALTER TABLE public.battle_votes
  ADD COLUMN IF NOT EXISTS super_tip_amount integer,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text;

-- archived_battle_votes: add SuperTip-related columns (including has_super_tip flag)
ALTER TABLE public.archived_battle_votes
  ADD COLUMN IF NOT EXISTS super_tip_amount integer,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS has_super_tip boolean;

COMMIT;
