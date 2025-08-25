-- SuperTip最小実装案
-- 履歴保存を最小限にする場合のテーブル設計

-- オプション1: 最小限のSuperTip記録
CREATE TABLE IF NOT EXISTS super_tips_minimal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 必須情報のみ
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 金額（簡素化）
  amount INTEGER NOT NULL CHECK (amount >= 100 AND amount <= 10000),
  
  -- Stripe決済ID（返金・照会用）
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  
  -- 基本タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 重複防止
  UNIQUE(sender_id, battle_id)
);

-- オプション2: battle_votes テーブル拡張のみ
ALTER TABLE battle_votes 
ADD COLUMN super_tip_amount INTEGER DEFAULT NULL,
ADD COLUMN stripe_payment_intent_id TEXT DEFAULT NULL;

-- オプション3: 完全にStripe側で管理
-- データベースには保存せず、Stripeのダッシュボードのみで管理
-- ※ただし、投票との関連性が失われるリスク
