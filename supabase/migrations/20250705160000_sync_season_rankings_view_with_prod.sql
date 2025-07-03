-- 20250705160000_sync_season_rankings_view_with_prod.sql
-- 開発環境のシーズンランキングビューを本番環境と同じ仕様に修正
-- 現在のシーズンのリアルタイムランキングを表示するように変更

-- 1. 既存のビューを削除
DROP VIEW IF EXISTS public.season_rankings_view;
DROP VIEW IF EXISTS public.season_voter_rankings_view;

-- 2. season_rankings_view を本番環境と同じ定義で作成
CREATE VIEW public.season_rankings_view AS
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.season_points,
  p.rating,
  get_rank_from_rating(p.rating) AS rank_name,
  get_rank_color_from_rating(p.rating) AS rank_color,
  0 AS battles_won,
  0 AS battles_lost,
  0.0 AS win_rate,
  p.created_at,
  p.updated_at,
  ROW_NUMBER() OVER (ORDER BY p.season_points DESC, p.created_at) AS position
FROM profiles p
WHERE p.is_deleted IS NOT TRUE 
  AND p.season_points > 0
ORDER BY p.season_points DESC, p.created_at;

-- 3. season_voter_rankings_view を本番環境と同じ定義で作成
CREATE VIEW public.season_voter_rankings_view AS
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.season_vote_points AS vote_count,
  p.rating,
  p.created_at,
  p.updated_at,
  ROW_NUMBER() OVER (ORDER BY p.season_vote_points DESC, p.created_at) AS position
FROM profiles p
WHERE p.is_deleted IS NOT TRUE 
  AND p.season_vote_points > 0
ORDER BY p.season_vote_points DESC, p.created_at;

-- 4. SECURITY INVOKERに設定
ALTER VIEW public.season_rankings_view SET (security_invoker = true);
ALTER VIEW public.season_voter_rankings_view SET (security_invoker = true);

COMMENT ON VIEW public.season_rankings_view IS 'SECURITY INVOKER: 現在のシーズンのリアルタイムランキング（profiles.season_pointsベース）';
COMMENT ON VIEW public.season_voter_rankings_view IS 'SECURITY INVOKER: 現在のシーズンの投票者ランキング（profiles.season_vote_pointsベース）'; 