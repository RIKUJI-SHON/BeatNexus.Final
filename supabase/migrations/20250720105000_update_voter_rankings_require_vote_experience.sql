-- ✅ 投票者ランキングビュー更新: 投票経験者のみ表示
-- 日付: 2025-07-20
-- 環境: 開発環境 (wdttluticnlqzmqmfvgt)
-- 目的: voter_rankings_view と season_voter_rankings_view で、投票経験者（vote_count >= 1）のみを表示

-- 1. 通常投票者ランキングビューの更新
-- 投票経験者（vote_count >= 1）のみを表示
DROP VIEW IF EXISTS voter_rankings_view;
CREATE VIEW voter_rankings_view AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.vote_count,
  dense_rank() OVER (ORDER BY p.vote_count DESC, p.created_at) AS rank
FROM profiles p
WHERE p.is_deleted = false
  AND p.vote_count >= 1;  -- 投票経験者のみ

-- 2. シーズン投票者ランキングビューの更新
-- 投票経験者（season_vote_points >= 1）のみを表示
DROP VIEW IF EXISTS season_voter_rankings_view;
CREATE VIEW season_voter_rankings_view AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.season_vote_points,
  dense_rank() OVER (ORDER BY p.season_vote_points DESC, p.created_at) AS rank
FROM profiles p
WHERE p.is_deleted = false
  AND p.season_vote_points >= 1;  -- シーズン投票経験者のみ

-- 3. 権限設定
GRANT SELECT ON voter_rankings_view TO authenticated, anon;
GRANT SELECT ON season_voter_rankings_view TO authenticated, anon;

-- 4. コメント追加
COMMENT ON VIEW voter_rankings_view IS '投票経験者（vote_count >= 1）のみを表示する投票者ランキング';
COMMENT ON VIEW season_voter_rankings_view IS 'シーズン投票経験者（season_vote_points >= 1）のみを表示するシーズン投票者ランキング';
