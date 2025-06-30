-- ============================================================================
-- シーズンポイント制度：seasons テーブル作成
-- ============================================================================

-- シーズン管理テーブル
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                                    -- 例: "2025-Q3"
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,            -- シーズン開始日時
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,              -- シーズン終了日時
    status TEXT NOT NULL DEFAULT 'upcoming' 
        CHECK (status IN ('upcoming', 'active', 'ended')), -- シーズン状態
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
CREATE INDEX IF NOT EXISTS idx_seasons_start_at ON seasons(start_at);
CREATE INDEX IF NOT EXISTS idx_seasons_end_at ON seasons(end_at);

-- RLS 有効化
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- ポリシー作成（全ユーザー読み取り可能、管理者のみ書き込み可能）
CREATE POLICY "seasons_select_policy" ON seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "seasons_insert_policy" ON seasons FOR INSERT TO authenticated 
    WITH CHECK (auth.jwt() ->> 'email' = 'admin@beatnexus.com');
CREATE POLICY "seasons_update_policy" ON seasons FOR UPDATE TO authenticated 
    USING (auth.jwt() ->> 'email' = 'admin@beatnexus.com');

-- 第1シーズンレコード作成（現在進行中として設定）
INSERT INTO seasons (name, start_at, end_at, status)
VALUES (
    '2025-S1',                                              -- 第1シーズン
    '2025-01-01 00:00:00+00',                              -- 仮のサービス開始日
    '2025-09-30 23:59:59+00',                              -- 第1シーズン終了日（約9ヶ月）
    'active'                                                -- 現在アクティブ
) ON CONFLICT DO NOTHING;

-- コメント追加
COMMENT ON TABLE seasons IS 'シーズン管理テーブル（3ヶ月毎の競技期間）';
COMMENT ON COLUMN seasons.name IS 'シーズン名（例: 2025-Q3）';
COMMENT ON COLUMN seasons.status IS 'シーズン状態（upcoming/active/ended）'; 