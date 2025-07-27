-- ✅ 開発環境: season_voter_rankings_view を本番環境に合わせる
-- 日付: 2025-07-27
-- 環境: 開発環境 (wdttluticnlqzmqmfvgt)
-- 目的: season_voter_rankings_view のカラム構造を本番環境と統一する
-- 問題: シーズン終了関数で参照されるカラム名が本番環境と異なるため、Heartbeatテストランキングがアーカイブされない

-- 既存のビューを削除
DROP VIEW IF EXISTS season_voter_rankings_view;

-- 本番環境と同じ定義でビューを再作成
CREATE VIEW season_voter_rankings_view AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.season_vote_points,
  dense_rank() OVER (ORDER BY p.season_vote_points DESC, p.created_at) AS rank
FROM profiles p
WHERE p.is_deleted = false 
AND p.season_vote_points >= 1;

-- ビューにコメントを追加
COMMENT ON VIEW season_voter_rankings_view IS 'シーズン投票者ランキングビュー：投票経験者（season_vote_points >= 1）のみ表示、本番環境と統一';
