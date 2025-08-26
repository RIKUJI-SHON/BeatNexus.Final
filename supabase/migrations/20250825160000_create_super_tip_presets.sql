-- SuperTip金額プリセット管理テーブル作成
-- BeatNexusのSuperTip機能用の金額プリセットを管理

CREATE TABLE IF NOT EXISTS super_tip_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- 例: "サポーター", "VIP", "スペシャル"
  amount INTEGER NOT NULL CHECK (amount >= 100), -- 金額（円）
  description TEXT, -- 説明文
  badge_icon TEXT, -- バッジアイコン（絵文字など）
  badge_color TEXT DEFAULT '#3B82F6', -- バッジ色（HEX）
  sort_order INTEGER DEFAULT 0, -- 表示順序
  is_active BOOLEAN DEFAULT true, -- 有効/無効
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_super_tip_presets_active_sort ON super_tip_presets(is_active, sort_order);

-- デフォルトプリセット挿入
INSERT INTO super_tip_presets (name, amount, description, badge_icon, badge_color, sort_order) VALUES
  ('サポーター', 100, '応援ありがとう！', '👏', '#10B981', 1),
  ('ファン', 300, 'いつも見てくれてありがとう！', '⭐', '#3B82F6', 2),
  ('VIP', 500, 'VIPサポーター！', '💎', '#8B5CF6', 3),
  ('スペシャル', 1000, 'スペシャルサポート！', '🏆', '#EF4444', 4),
  ('レジェンド', 3000, 'レジェンドサポーター！', '👑', '#F59E0B', 5)
ON CONFLICT DO NOTHING;

-- SuperTip統計ビュー作成
CREATE OR REPLACE VIEW super_tip_stats AS
SELECT 
  bv.battle_id,
  COUNT(*) FILTER (WHERE bv.super_tip_amount IS NOT NULL) as super_tip_count,
  COALESCE(SUM(bv.super_tip_amount), 0) as total_amount,
  COALESCE(AVG(bv.super_tip_amount), 0) as avg_amount,
  MAX(bv.super_tip_amount) as max_amount,
  MIN(bv.super_tip_amount) as min_amount
FROM battle_votes bv
WHERE bv.super_tip_amount IS NOT NULL
GROUP BY bv.battle_id;

-- ユーザー別SuperTip受取統計ビュー
CREATE OR REPLACE VIEW user_super_tip_received_stats AS
SELECT 
  u.id as user_id,
  u.username,
  COUNT(*) as tips_received_count,
  COALESCE(SUM(bv.super_tip_amount), 0) as total_received,
  COALESCE(AVG(bv.super_tip_amount), 0) as avg_received,
  MAX(bv.super_tip_amount) as max_received
FROM profiles u
LEFT JOIN active_battles ab ON (u.id = ab.player1_user_id OR u.id = ab.player2_user_id)
LEFT JOIN battle_votes bv ON ab.id = bv.battle_id 
  AND bv.super_tip_amount IS NOT NULL
  AND (
    (bv.vote = 'A' AND u.id = ab.player1_user_id) OR
    (bv.vote = 'B' AND u.id = ab.player2_user_id)
  )
GROUP BY u.id, u.username;

-- RLS設定
ALTER TABLE super_tip_presets ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが有効なプリセットを閲覧可能
CREATE POLICY "super_tip_presets_select_policy" ON super_tip_presets
  FOR SELECT USING (is_active = true);

-- 管理者のみ更新可能（将来的に管理者ロールを実装する場合）
CREATE POLICY "super_tip_presets_admin_policy" ON super_tip_presets
  FOR ALL USING (false); -- 現在は管理者機能なしのため無効

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_super_tip_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_super_tip_presets_updated_at_trigger
  BEFORE UPDATE ON super_tip_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_super_tip_presets_updated_at();
