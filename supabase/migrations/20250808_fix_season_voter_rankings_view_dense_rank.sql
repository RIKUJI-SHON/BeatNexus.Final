-- 20250808_fix_season_voter_rankings_view_dense_rank.sql
-- 目的: 投票者ランキングビューの順位計算でcreated_atによる順位分けを削除し、純粋な同率順位を実現
-- 問題: DENSE_RANK() OVER (ORDER BY points DESC, created_at) により同じポイントでも順位が分かれる
-- 解決: created_atを削除してポイントのみで順位計算

BEGIN;

-- voter_rankings_view の修正（created_at削除）
CREATE OR REPLACE VIEW public.voter_rankings_view AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.vote_count,
  DENSE_RANK() OVER (ORDER BY p.vote_count DESC) AS rank -- created_at を削除
FROM profiles p
WHERE p.is_deleted = false 
  AND p.vote_count >= 1;

COMMENT ON VIEW public.voter_rankings_view 
IS '通算投票者ランキングビュー：DENSE_RANK()による純粋な同率順位計算（created_at除去）';

-- season_voter_rankings_view の修正（created_at削除）
CREATE OR REPLACE VIEW public.season_voter_rankings_view AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.season_vote_points,
  DENSE_RANK() OVER (ORDER BY p.season_vote_points DESC) AS rank -- created_at を削除
FROM profiles p
WHERE p.is_deleted = false 
  AND p.season_vote_points >= 1;

COMMENT ON VIEW public.season_voter_rankings_view 
IS 'シーズン投票者ランキングビュー：DENSE_RANK()による純粋な同率順位計算（created_at除去）';

COMMIT;
