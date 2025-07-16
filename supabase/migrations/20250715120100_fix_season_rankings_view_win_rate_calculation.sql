-- ✅ シーズンランキングビューの勝率計算修正
-- 日付: 2025-07-15
-- 環境: 開発環境 (wdttluticnlqzmqmfvgt)
-- 目的: season_rankings_view の勝率計算を正しく修正

-- シーズンランキングビューの勝率計算修正版
DROP VIEW IF EXISTS season_rankings_view;
CREATE VIEW season_rankings_view AS
WITH battle_stats AS (
  -- 各ユーザーのバトル統計を計算
  SELECT 
    p.id AS user_id,
    -- 勝利数
    (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) AS battles_won,
    -- 敗北数
    (SELECT count(*) FROM archived_battles ab 
     WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
     AND (ab.winner_id IS NOT NULL) 
     AND (ab.winner_id <> p.id)) AS battles_lost,
    -- 総バトル数
    (SELECT count(*) FROM archived_battles ab 
     WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
     AND (ab.winner_id IS NOT NULL)) AS total_battles
  FROM profiles p
  WHERE p.is_deleted IS NOT TRUE 
    AND p.season_points > 0
)
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.season_points,
  p.rating,
  get_rank_from_rating(p.rating) AS rank_name,
  get_rank_color_from_rating(p.rating) AS rank_color,
  bs.battles_won,
  bs.battles_lost,
  -- 正しい勝率計算
  CASE 
    WHEN bs.total_battles = 0 THEN 0.0
    ELSE bs.battles_won::float / bs.total_battles::float
  END AS win_rate,
  p.created_at,
  p.updated_at,
  row_number() OVER (ORDER BY p.season_points DESC, p.created_at) AS "position"
FROM profiles p
JOIN battle_stats bs ON p.id = bs.user_id
WHERE p.is_deleted IS NOT TRUE 
  AND p.season_points > 0
  AND (bs.battles_won + bs.battles_lost) >= 1  -- バトル経験者のみ
ORDER BY p.season_points DESC, p.created_at;

-- 権限設定
GRANT SELECT ON season_rankings_view TO authenticated, anon;

-- コメント更新
COMMENT ON VIEW season_rankings_view IS 'バトル経験者（勝敗数合計1以上）のみを表示するシーズンランキング（正確なバトル数・勝率計算付き）'; 