-- 20250112120300_update_ranking_views.sql
-- ランキングビューの更新：削除されたユーザーを除外

-- 1. レーティングランキングビューの更新
DROP VIEW IF EXISTS rankings_view;

CREATE VIEW rankings_view AS
WITH battle_stats AS (
  -- 勝利したバトル
  SELECT 
    winner_id AS user_id,
    COUNT(*) AS battles_won
  FROM archived_battles
  WHERE winner_id IS NOT NULL
  GROUP BY winner_id
  
  UNION ALL
  
  -- 敗北したバトル（プレイヤー1）
  SELECT 
    player1_user_id AS user_id,
    0 AS battles_won
  FROM archived_battles
  WHERE winner_id != player1_user_id OR winner_id IS NULL
  
  UNION ALL
  
  -- 敗北したバトル（プレイヤー2）
  SELECT 
    player2_user_id AS user_id,
    0 AS battles_won
  FROM archived_battles
  WHERE winner_id != player2_user_id OR winner_id IS NULL
),
aggregated_stats AS (
  SELECT 
    user_id,
    SUM(battles_won) AS battles_won,
    COUNT(*)::numeric - SUM(battles_won) AS battles_lost
  FROM battle_stats
  GROUP BY user_id
)
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.rating,
  p.rating AS season_points,
  get_rank_from_rating(p.rating) AS rank_name,
  get_rank_color_from_rating(p.rating) AS rank_color,
  COALESCE(s.battles_won, 0)::numeric AS battles_won,
  COALESCE(s.battles_lost, 0)::numeric AS battles_lost,
  CASE 
    WHEN (COALESCE(s.battles_won, 0) + COALESCE(s.battles_lost, 0)) > 0
    THEN ROUND((COALESCE(s.battles_won, 0)::numeric / (COALESCE(s.battles_won, 0) + COALESCE(s.battles_lost, 0))) * 100, 1)
    ELSE 0
  END AS win_rate,
  ROW_NUMBER() OVER (ORDER BY p.rating DESC) AS position
FROM profiles p
LEFT JOIN aggregated_stats s ON p.id = s.user_id
WHERE p.is_deleted IS NOT TRUE  -- 🆕 削除されたユーザーを除外
ORDER BY p.rating DESC;

-- 2. 投票者ランキングビューの更新
DROP VIEW IF EXISTS voter_rankings_view;

CREATE VIEW voter_rankings_view AS
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.vote_count,
  p.rating,
  get_rank_from_rating(p.rating) AS rank_name,
  get_rank_color_from_rating(p.rating) AS rank_color,
  p.created_at,
  p.updated_at,
  ROW_NUMBER() OVER (ORDER BY p.vote_count DESC, p.username) AS position
FROM profiles p
WHERE p.vote_count > 0 
  AND p.is_deleted IS NOT TRUE  -- 🆕 削除されたユーザーを除外
ORDER BY p.vote_count DESC, p.username;

-- 3. コメント追加
COMMENT ON VIEW rankings_view IS '削除されたユーザーを除外したレーティングベースランキング。is_deleted=TRUEのユーザーは表示されない。';
COMMENT ON VIEW voter_rankings_view IS '削除されたユーザーを除外した投票数ベースランキング。is_deleted=TRUEのユーザーは表示されない。';

-- 4. 確認用クエリ
SELECT 
  'rankings_view updated' as status,
  COUNT(*) as total_active_users
FROM rankings_view;

SELECT 
  'voter_rankings_view updated' as status,
  COUNT(*) as total_active_voters
FROM voter_rankings_view; 