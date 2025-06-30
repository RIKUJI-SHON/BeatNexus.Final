-- ============================================================================
-- シーズンポイント制度：profiles テーブルにシーズン関連カラム追加
-- ============================================================================

-- season_points: シーズンごとのバトルポイント（リセット対象）
-- season_vote_points: シーズンごとの投票ポイント（リセット対象）

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS season_points INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS season_vote_points INT NOT NULL DEFAULT 0;

-- 既存の rating を season_points に移行（初回のみ）
-- 現在の戦績を第1シーズンとして引き継ぎ
UPDATE profiles 
SET season_points = rating 
WHERE season_points = 0 AND rating > 0;

-- 既存の vote_count を season_vote_points に移行（初回のみ）
UPDATE profiles 
SET season_vote_points = vote_count 
WHERE season_vote_points = 0 AND vote_count > 0;

-- コメント追加
COMMENT ON COLUMN profiles.season_points IS 'シーズンごとのバトルポイント（3ヶ月毎にリセット）';
COMMENT ON COLUMN profiles.season_vote_points IS 'シーズンごとの投票ポイント（3ヶ月毎にリセット）'; 