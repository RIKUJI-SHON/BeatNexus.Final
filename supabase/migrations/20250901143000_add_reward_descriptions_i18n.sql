-- 20250901143000_add_reward_descriptions_i18n.sql
-- 目的: rewards の説明文を多言語化（ja/en）

BEGIN;

ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_ja text;

-- 既存の description を日本語として移行（既に埋まっている場合は維持）
UPDATE public.rewards
SET description_ja = COALESCE(description_ja, description)
WHERE description IS NOT NULL
  AND (description_ja IS NULL OR description_ja = '');

COMMIT;
