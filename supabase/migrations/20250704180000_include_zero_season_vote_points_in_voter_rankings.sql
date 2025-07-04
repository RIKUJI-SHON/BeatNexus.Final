-- 20250704180000_include_zero_season_vote_points_in_voter_rankings.sql
-- シーズン投票者ランキングビューを改訂し、season_vote_points が 0 のユーザーも含める。
-- これによりランキングページに全ユーザー（削除ユーザー除く）が表示される。

-- 1. 既存ビューを削除
DROP VIEW IF EXISTS public.season_voter_rankings_view;

-- 2. 再作成: 0 ポイントでも含める（フィルタを削除）
CREATE VIEW public.season_voter_rankings_view AS
SELECT
  p.id          AS user_id,
  p.username,
  p.avatar_url,
  p.season_vote_points AS vote_count,
  p.rating,
  p.created_at,
  p.updated_at,
  ROW_NUMBER() OVER (ORDER BY p.season_vote_points DESC, p.created_at) AS position
FROM public.profiles p
WHERE p.is_deleted IS NOT TRUE
ORDER BY p.season_vote_points DESC, p.created_at;

-- 3. セキュリティ INVOKER
ALTER VIEW public.season_voter_rankings_view SET (security_invoker = true);

-- 4. コメント
COMMENT ON VIEW public.season_voter_rankings_view IS 'SECURITY INVOKER: 現在のシーズンの投票者ランキング（season_vote_points=0 ユーザーも含む）'; 