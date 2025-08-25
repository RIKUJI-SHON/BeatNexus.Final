-- SuperTip機能：投票システムへのスーパーチャット風コメント追加
-- 投票結果に影響を与えない有料コメント機能
-- 金額に応じたコメント表示優先度とプレイヤーへの通知

-- 1. battle_votesテーブルにSuperTip関連カラムを追加
ALTER TABLE public.battle_votes 
ADD COLUMN super_tip_amount integer DEFAULT 0,
ADD COLUMN stripe_payment_intent_id text,
ADD COLUMN payment_status text DEFAULT 'none';

-- payment_statusの制約を追加
ALTER TABLE public.battle_votes 
ADD CONSTRAINT battle_votes_payment_status_check 
CHECK (payment_status IN ('none', 'pending', 'completed', 'failed'));

-- 2. archived_battle_votesテーブルにも同じカラムを追加（アーカイブ対応）
ALTER TABLE public.archived_battle_votes 
ADD COLUMN super_tip_amount integer DEFAULT 0,
ADD COLUMN stripe_payment_intent_id text,
ADD COLUMN payment_status text DEFAULT 'none';

-- archived_battle_votesの制約を追加
ALTER TABLE public.archived_battle_votes 
ADD CONSTRAINT archived_battle_votes_payment_status_check 
CHECK (payment_status IN ('none', 'pending', 'completed', 'failed'));

-- 3. notificationsテーブルのtype制約にsuper_tipを追加
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (((type)::text = ANY (ARRAY[
  ('info'::character varying)::text, 
  ('success'::character varying)::text, 
  ('warning'::character varying)::text, 
  ('battle_matched'::character varying)::text, 
  ('battle_win'::character varying)::text, 
  ('battle_lose'::character varying)::text, 
  ('battle_draw'::character varying)::text, 
  ('season_start'::character varying)::text,
  ('super_tip'::character varying)::text
])));

-- 4. コメント
COMMENT ON COLUMN public.battle_votes.super_tip_amount IS 'SuperTip金額（円単位）。0=通常投票、1以上=SuperTip付き投票';
COMMENT ON COLUMN public.battle_votes.stripe_payment_intent_id IS 'Stripe PaymentIntent ID（決済追跡用）';
COMMENT ON COLUMN public.battle_votes.payment_status IS 'SuperTip決済状態：none(通常投票), pending(決済中), completed(決済完了), failed(決済失敗)';

COMMENT ON COLUMN public.archived_battle_votes.super_tip_amount IS 'アーカイブされたSuperTip金額';
COMMENT ON COLUMN public.archived_battle_votes.stripe_payment_intent_id IS 'アーカイブされたStripe PaymentIntent ID';
COMMENT ON COLUMN public.archived_battle_votes.payment_status IS 'アーカイブされたSuperTip決済状態';
