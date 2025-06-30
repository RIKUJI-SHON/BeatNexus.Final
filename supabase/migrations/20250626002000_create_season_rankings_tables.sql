-- ============================================================================
-- シーズンポイント制度：ランキング履歴テーブル作成
-- ============================================================================

-- バトルランキング履歴テーブル
CREATE TABLE IF NOT EXISTS season_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rank INT NOT NULL,                                      -- 最終順位
    points INT NOT NULL,                                    -- 最終ポイント
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 投票者ランキング履歴テーブル
CREATE TABLE IF NOT EXISTS season_voter_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rank INT NOT NULL,                                      -- 最終順位
    votes INT NOT NULL,                                     -- 最終投票数
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_season_rankings_season_id ON season_rankings(season_id);
CREATE INDEX IF NOT EXISTS idx_season_rankings_user_id ON season_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_season_rankings_rank ON season_rankings(rank);

CREATE INDEX IF NOT EXISTS idx_season_voter_rankings_season_id ON season_voter_rankings(season_id);
CREATE INDEX IF NOT EXISTS idx_season_voter_rankings_user_id ON season_voter_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_season_voter_rankings_rank ON season_voter_rankings(rank);

-- ユニーク制約（同じシーズンで同じユーザーは1回のみ）
CREATE UNIQUE INDEX IF NOT EXISTS idx_season_rankings_unique 
    ON season_rankings(season_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_season_voter_rankings_unique 
    ON season_voter_rankings(season_id, user_id);

-- RLS 有効化
ALTER TABLE season_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_voter_rankings ENABLE ROW LEVEL SECURITY;

-- ポリシー作成（全ユーザー読み取り可能）
CREATE POLICY "season_rankings_select_policy" ON season_rankings 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "season_voter_rankings_select_policy" ON season_voter_rankings 
    FOR SELECT TO authenticated USING (true);

-- システムによる書き込みのみ許可（手動操作防止）
CREATE POLICY "season_rankings_insert_policy" ON season_rankings 
    FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "season_voter_rankings_insert_policy" ON season_voter_rankings 
    FOR INSERT TO authenticated WITH CHECK (false);

-- コメント追加
COMMENT ON TABLE season_rankings IS 'シーズン終了時のバトルランキング履歴';
COMMENT ON TABLE season_voter_rankings IS 'シーズン終了時の投票者ランキング履歴';
COMMENT ON COLUMN season_rankings.rank IS '最終順位（1位、2位...）';
COMMENT ON COLUMN season_rankings.points IS '最終ポイント数';
COMMENT ON COLUMN season_voter_rankings.votes IS '最終投票数'; 