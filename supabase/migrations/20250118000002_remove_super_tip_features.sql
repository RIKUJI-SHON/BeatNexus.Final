-- SuperTip機能完全削除マイグレーション
-- 作成日: 2025-01-18
-- 説明: SuperTip関連のテーブル、カラム、制約を全て削除

-- 1. SuperTipメインテーブルとバックアップテーブルの削除
DROP TABLE IF EXISTS public.super_tips CASCADE;
DROP TABLE IF EXISTS public.super_tips_backup CASCADE;

-- 2. battle_votesテーブルからSuperTip関連カラムを削除
ALTER TABLE public.battle_votes 
  DROP COLUMN IF EXISTS super_tip_amount,
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS payment_status;

-- 3. archived_battle_votesテーブルからSuperTip関連カラムを削除
ALTER TABLE public.archived_battle_votes 
  DROP COLUMN IF EXISTS super_tip_amount,
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS payment_status;

-- 4. profilesテーブルからStripe Connect関連カラムを削除
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_charges_enabled;

-- 5. notificationsテーブルのtype制約を更新（super_tipタイプを削除）
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type::text = ANY (ARRAY[
    'info'::character varying::text, 
    'success'::character varying::text, 
    'warning'::character varying::text, 
    'battle_matched'::character varying::text, 
    'battle_win'::character varying::text, 
    'battle_lose'::character varying::text, 
    'battle_draw'::character varying::text, 
    'season_start'::character varying::text, 
    'news_article'::character varying::text
  ]));

-- 6. SuperTipに関連する通知を削除
DELETE FROM public.notifications 
WHERE type = 'super_tip';

-- マイグレーション完了
-- SuperTip機能に関連するすべてのデータベース要素が削除されました
