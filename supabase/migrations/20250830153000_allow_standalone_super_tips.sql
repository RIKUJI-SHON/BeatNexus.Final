-- Allow standalone SuperTips (no battle reference) by relaxing battle reference constraint
-- Previously: CHECK (((battle_id IS NOT NULL AND archived_battle_id IS NULL) OR (battle_id IS NULL AND archived_battle_id IS NOT NULL)))
-- Now: only forbid both set at the same time; allow both NULL for standalone tips.

BEGIN;

ALTER TABLE public.super_tips
  DROP CONSTRAINT IF EXISTS super_tips_battle_reference_check;

ALTER TABLE public.super_tips
  ADD CONSTRAINT super_tips_battle_reference_check
  CHECK (NOT ((battle_id IS NOT NULL) AND (archived_battle_id IS NOT NULL)));

COMMIT;
