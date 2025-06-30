-- ============================================================================
-- シーズンポイント制度：battles と votes テーブルに season_id 追加
-- ============================================================================

-- active_battles テーブルに season_id 追加
ALTER TABLE active_battles 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

-- archived_battles テーブルに season_id 追加
ALTER TABLE archived_battles 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

-- battle_votes テーブルに season_id 追加
ALTER TABLE battle_votes 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

-- インデックス作成（分析用クエリの高速化）
CREATE INDEX IF NOT EXISTS idx_active_battles_season_id ON active_battles(season_id);
CREATE INDEX IF NOT EXISTS idx_archived_battles_season_id ON archived_battles(season_id);
CREATE INDEX IF NOT EXISTS idx_battle_votes_season_id ON battle_votes(season_id);

-- 既存データに現在のアクティブシーズンIDを設定
DO $$
DECLARE
    active_season_id UUID;
BEGIN
    -- アクティブシーズンのIDを取得
    SELECT id INTO active_season_id FROM seasons WHERE status = 'active' LIMIT 1;
    
    IF active_season_id IS NOT NULL THEN
        -- 既存のアクティブバトルに設定
        UPDATE active_battles 
        SET season_id = active_season_id 
        WHERE season_id IS NULL;
        
        -- 既存のアーカイブバトルに設定
        UPDATE archived_battles 
        SET season_id = active_season_id 
        WHERE season_id IS NULL;
        
        -- 既存の投票に設定
        UPDATE battle_votes 
        SET season_id = active_season_id 
        WHERE season_id IS NULL;
    END IF;
END $$;

-- コメント追加
COMMENT ON COLUMN active_battles.season_id IS 'バトルが実施されたシーズン（分析用）';
COMMENT ON COLUMN archived_battles.season_id IS 'バトルが完了したシーズン（分析用）';
COMMENT ON COLUMN battle_votes.season_id IS '投票が行われたシーズン（分析用）'; 