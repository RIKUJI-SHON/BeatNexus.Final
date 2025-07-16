-- ✅ ランキングビュー更新: バトル経験者のみ表示
-- 日付: 2025-07-15
-- 環境: 開発環境 (wdttluticnlqzmqmfvgt)
-- 目的: rankings_view と season_rankings_view で、バトル経験者（勝敗数合計1以上）のみを表示

-- 1. 通常ランキングビューの更新
-- バトル経験者（battles_won + battles_lost >= 1）のみを表示
DROP VIEW IF EXISTS rankings_view;
CREATE VIEW rankings_view AS
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.rating,
  p.season_points,
  (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) AS battles_won,
  (SELECT count(*) FROM archived_battles ab 
   WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
   AND (ab.winner_id IS NOT NULL) 
   AND (ab.winner_id <> p.id)) AS battles_lost,
  rank() OVER (ORDER BY p.rating DESC, p.updated_at) AS rank
FROM profiles p
WHERE p.is_deleted = false
  AND (
    -- バトル経験者のみ: 勝利数 + 敗北数 >= 1
    (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) +
    (SELECT count(*) FROM archived_battles ab 
     WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
     AND (ab.winner_id IS NOT NULL) 
     AND (ab.winner_id <> p.id)) >= 1
  );

-- 2. シーズンランキングビューの更新
-- 実際のバトル数計算 + バトル経験者のみ表示
DROP VIEW IF EXISTS season_rankings_view;
CREATE VIEW season_rankings_view AS
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.season_points,
  p.rating,
  get_rank_from_rating(p.rating) AS rank_name,
  get_rank_color_from_rating(p.rating) AS rank_color,
  -- 実際のバトル数計算（従来の固定値0から変更）
  (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) AS battles_won,
  (SELECT count(*) FROM archived_battles ab 
   WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
   AND (ab.winner_id IS NOT NULL) 
   AND (ab.winner_id <> p.id)) AS battles_lost,
  -- 勝率計算（バトル数が0の場合は0.0）
  CASE 
    WHEN (SELECT count(*) FROM archived_battles ab 
          WHERE (ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) = 0 
    THEN 0.0
    ELSE (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id)::float / 
         (SELECT count(*) FROM archived_battles ab 
          WHERE (ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id))::float
  END AS win_rate,
  p.created_at,
  p.updated_at,
  row_number() OVER (ORDER BY p.season_points DESC, p.created_at) AS "position"
FROM profiles p
WHERE p.is_deleted IS NOT TRUE 
  AND p.season_points > 0
  AND (
    -- バトル経験者のみ: 勝利数 + 敗北数 >= 1
    (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) +
    (SELECT count(*) FROM archived_battles ab 
     WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
     AND (ab.winner_id IS NOT NULL) 
     AND (ab.winner_id <> p.id)) >= 1
  )
ORDER BY p.season_points DESC, p.created_at;

-- 3. ビューの権限設定
GRANT SELECT ON rankings_view TO authenticated, anon;
GRANT SELECT ON season_rankings_view TO authenticated, anon;

-- 4. コメント追加
COMMENT ON VIEW rankings_view IS 'バトル経験者（勝敗数合計1以上）のみを表示するレーティングランキング';
COMMENT ON VIEW season_rankings_view IS 'バトル経験者（勝敗数合計1以上）のみを表示するシーズンランキング（実際のバトル数・勝率計算付き）'; 