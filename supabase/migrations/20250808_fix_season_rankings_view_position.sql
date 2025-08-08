-- 20250808_fix_season_rankings_view_position.sql
-- 目的: season_rankings_viewの順位計算をROW_NUMBER()からDENSE_RANK()に変更し、自然な順位表示にする
-- 問題: 同率の場合に次の順位が飛ばされる問題（同率1位の次が3位になる）
-- 解決: DENSE_RANK()を使用して同率の場合は次の順位を飛ばさない自然な順位表示にする

BEGIN;

-- season_rankings_view を DENSE_RANK() を使用するように修正
CREATE OR REPLACE VIEW public.season_rankings_view AS
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
  -- ROW_NUMBER() から DENSE_RANK() に変更
  -- 同じポイントの場合は同じ順位、次の順位は連続する
  DENSE_RANK() OVER (ORDER BY p.season_points DESC) AS position
FROM profiles p
WHERE 
  p.is_deleted IS NOT TRUE 
  AND p.season_points > 0 
  AND EXISTS (
    SELECT 1
    FROM archived_battles ab
    JOIN seasons s ON s.id = ab.season_id
    WHERE s.status = 'active'
      AND (ab.player1_user_id = p.id OR ab.player2_user_id = p.id)
  )
ORDER BY p.season_points DESC, p.created_at;

COMMENT ON VIEW public.season_rankings_view 
IS 'シーズンランキングビュー：バトル参加者のみ表示、DENSE_RANK()による自然な順位計算';

COMMIT;
