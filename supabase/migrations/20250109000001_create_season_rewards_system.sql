-- シーズン報酬システムのデータベース設計
-- 作成日: 2025-01-09
-- 機能: シーズン終了時の限定バッジとアイコンフレーム報酬システム

-- 1. 報酬（バッジ・フレーム）の定義テーブル
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 報酬名（例: "シーズン1覇者", "ダイヤモンドバッジ"）
  description TEXT, -- 報酬の説明
  type TEXT NOT NULL CHECK (type IN ('badge', 'frame')), -- バッジ or フレーム
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')), -- レア度
  image_url TEXT NOT NULL, -- 画像URL
  
  -- 獲得条件関連
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE, -- 特定シーズン限定報酬
  rank_requirement INTEGER, -- 必要ランク（1位, 2位, 3位など、nullの場合は全員）
  min_battles INTEGER DEFAULT 0, -- 最低バトル数（参加条件）
  
  -- メタデータ
  is_limited BOOLEAN DEFAULT true, -- 限定報酬かどうか
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ユーザー報酬所有権管理テーブル
CREATE TABLE user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  earned_season_id UUID REFERENCES seasons(id), -- 獲得時のシーズン
  
  -- 制約: 同じユーザーが同じ報酬を複数回獲得することを防ぐ
  UNIQUE(user_id, reward_id)
);

-- 3. プロフィールテーブル拡張（装備中フレーム）
ALTER TABLE profiles 
ADD COLUMN equipped_frame_id UUID REFERENCES rewards(id) ON DELETE SET NULL;

-- 4. インデックスの作成
CREATE INDEX idx_rewards_type ON rewards(type);
CREATE INDEX idx_rewards_season_id ON rewards(season_id);
CREATE INDEX idx_rewards_rarity ON rewards(rarity);

CREATE INDEX idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX idx_user_rewards_reward_id ON user_rewards(reward_id);
CREATE INDEX idx_user_rewards_earned_season ON user_rewards(earned_season_id);

CREATE INDEX idx_profiles_equipped_frame ON profiles(equipped_frame_id);

-- 5. RLS（Row Level Security）設定
-- rewards テーブル: 読み取り専用
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rewards" ON rewards
  FOR SELECT USING (true);

-- user_rewards テーブル: 自分の報酬のみ参照可能
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own rewards" ON user_rewards
  FOR SELECT USING (auth.uid() = user_id);

-- profilesテーブルの equipped_frame_id: 自分のみ更新可能
CREATE POLICY "Users can update own equipped frame" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 6. 報酬付与関数
CREATE OR REPLACE FUNCTION grant_season_rewards(season_id_param UUID)
RETURNS TABLE(user_id UUID, reward_count INTEGER) AS $$
BEGIN
  -- シーズン終了時のランキング上位3位に報酬を付与
  WITH season_rankings AS (
    SELECT 
      p.id as user_id,
      p.rating,
      ROW_NUMBER() OVER (ORDER BY p.rating DESC) as rank
    FROM profiles p
    WHERE p.id IN (
      SELECT DISTINCT COALESCE(b.user1_id, b.user2_id)
      FROM battles b 
      WHERE b.season_id = season_id_param
        AND b.status = 'completed'
    )
  ),
  reward_grants AS (
    INSERT INTO user_rewards (user_id, reward_id, earned_season_id)
    SELECT 
      sr.user_id,
      r.id as reward_id,
      season_id_param
    FROM season_rankings sr
    JOIN rewards r ON (
      r.season_id = season_id_param 
      AND (r.rank_requirement IS NULL OR sr.rank <= r.rank_requirement)
    )
    LEFT JOIN user_rewards ur ON (ur.user_id = sr.user_id AND ur.reward_id = r.id)
    WHERE ur.id IS NULL -- 重複防止
    RETURNING user_id, reward_id
  )
  SELECT 
    rg.user_id,
    COUNT(*)::INTEGER as reward_count
  FROM reward_grants rg
  GROUP BY rg.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. サンプル報酬データの挿入
-- シーズン1の報酬例（実際のシーズンIDに置き換える必要あり）
INSERT INTO rewards (name, description, type, rarity, image_url, rank_requirement, season_id) VALUES
  ('シーズン1覇者', 'シーズン1で1位を獲得した証', 'badge', 'legendary', '/images/rewards/season1-champion-badge.png', 1, NULL),
  ('シーズン1準優勝', 'シーズン1で2位を獲得した証', 'badge', 'epic', '/images/rewards/season1-runner-up-badge.png', 2, NULL),
  ('シーズン1三位', 'シーズン1で3位を獲得した証', 'badge', 'rare', '/images/rewards/season1-third-place-badge.png', 3, NULL),
  ('ゴールデンフレーム', 'シーズン1上位者限定の黄金フレーム', 'frame', 'legendary', '/images/rewards/golden-frame.png', 1, NULL),
  ('シルバーフレーム', 'シーズン1上位者限定のシルバーフレーム', 'frame', 'epic', '/images/rewards/silver-frame.png', 2, NULL),
  ('ブロンズフレーム', 'シーズン1上位者限定のブロンズフレーム', 'frame', 'rare', '/images/rewards/bronze-frame.png', 3, NULL);

-- 9. コメント追加
COMMENT ON TABLE rewards IS 'シーズン報酬（バッジ・フレーム）の定義';
COMMENT ON TABLE user_rewards IS 'ユーザーの報酬所有権管理';
COMMENT ON COLUMN profiles.equipped_frame_id IS '現在装備中のアイコンフレーム';
