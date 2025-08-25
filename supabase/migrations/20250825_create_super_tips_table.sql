-- SuperTips テーブル作成
-- BeatNexus SuperTip システム用のデータベーステーブル

CREATE TABLE IF NOT EXISTS super_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 関連情報
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 投票情報
  vote CHAR(1) CHECK (vote IN ('A', 'B')) NOT NULL,
  comment TEXT NOT NULL CHECK (LENGTH(comment) <= 500),
  
  -- 金額情報（円単位）
  amount INTEGER NOT NULL CHECK (amount >= 100 AND amount <= 10000),
  platform_fee INTEGER NOT NULL DEFAULT 0,
  recipient_amount INTEGER NOT NULL DEFAULT 0,
  
  -- Stripe決済情報
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id TEXT,
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- インデックス用
  UNIQUE(sender_id, battle_id) -- 1ユーザー1バトルにつき1回のSuperTip制限
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_super_tips_battle_id ON super_tips(battle_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_sender_id ON super_tips(sender_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_recipient_id ON super_tips(recipient_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_status ON super_tips(status);
CREATE INDEX IF NOT EXISTS idx_super_tips_created_at ON super_tips(created_at);

-- Row Level Security (RLS) 有効化
ALTER TABLE super_tips ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
-- 誰でも自分が送った/受け取ったSuperTipを閲覧可能
CREATE POLICY "Users can view their own super tips" ON super_tips
  FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- バトル参加者は関連するSuperTipを閲覧可能
CREATE POLICY "Battle participants can view super tips" ON super_tips
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM battles 
      WHERE battles.id = super_tips.battle_id 
      AND (battles.player1_user_id = auth.uid() OR battles.player2_user_id = auth.uid())
    )
  );

-- 認証済みユーザーはSuperTipを作成可能（送信者として）
CREATE POLICY "Authenticated users can create super tips" ON super_tips
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- 送信者のみがステータス更新可能（通常は自動処理）
CREATE POLICY "Senders can update their super tips" ON super_tips
  FOR UPDATE 
  USING (auth.uid() = sender_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_super_tips_updated_at 
  BEFORE UPDATE ON super_tips 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SuperTip統計用ビュー
CREATE OR REPLACE VIEW super_tip_stats AS
SELECT 
  battle_id,
  COUNT(*) as total_super_tips,
  SUM(amount) as total_amount,
  SUM(recipient_amount) as total_recipient_amount,
  SUM(platform_fee) as total_platform_fee,
  AVG(amount) as average_amount,
  COUNT(CASE WHEN vote = 'A' THEN 1 END) as vote_a_super_tips,
  COUNT(CASE WHEN vote = 'B' THEN 1 END) as vote_b_super_tips,
  SUM(CASE WHEN vote = 'A' THEN amount ELSE 0 END) as vote_a_total_amount,
  SUM(CASE WHEN vote = 'B' THEN amount ELSE 0 END) as vote_b_total_amount
FROM super_tips 
WHERE status = 'completed'
GROUP BY battle_id;

-- ユーザーSuperTip統計用ビュー
CREATE OR REPLACE VIEW user_super_tip_stats AS
SELECT 
  sender_id as user_id,
  'sent' as type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as average_amount
FROM super_tips 
WHERE status = 'completed'
GROUP BY sender_id

UNION ALL

SELECT 
  recipient_id as user_id,
  'received' as type,
  COUNT(*) as count,
  SUM(recipient_amount) as total_amount,
  AVG(recipient_amount) as average_amount
FROM super_tips 
WHERE status = 'completed'
GROUP BY recipient_id;
