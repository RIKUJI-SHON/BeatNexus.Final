-- ✅ 本番環境: シーズン終了関数修正 - バトル経験者のみアーカイブ
-- 日付: 2025-07-20
-- 環境: 本番環境 (qgqcjtjxaoplhxurbpis)
-- 目的: end_current_season() 関数で、バトル経験者のみをシーズンランキングアーカイブに含める
-- 問題: デフォルト1200ポイントのバトル未経験者も season_points > 0 でアーカイブされていた

-- 既存の関数を削除
DROP FUNCTION IF EXISTS end_current_season();

-- 修正版の関数を作成
CREATE OR REPLACE FUNCTION end_current_season()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_season RECORD;
  v_player_ranking_count INTEGER := 0;
  v_voter_ranking_count INTEGER := 0;
  v_new_season_id UUID;
  v_new_season_name TEXT;
  v_next_season_number INTEGER;
BEGIN
  -- 現在のアクティブシーズンを取得
  SELECT * INTO v_current_season
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'アクティブなシーズンが見つかりません'
    );
  END IF;

  -- 1. バトルランキングをseason_rankingsに記録
  -- ⚠️ 修正: バトル経験者（勝敗数合計1以上）のみをアーカイブ
  INSERT INTO season_rankings (
    season_id,
    user_id,
    points,
    rank
  )
  SELECT 
    v_current_season.id,
    p.id,
    p.season_points,
    ROW_NUMBER() OVER (ORDER BY p.season_points DESC, p.username ASC)
  FROM profiles p
  WHERE p.is_deleted = FALSE
  AND (
    -- バトル経験者のみ: 勝利数 + 敗北数 >= 1
    (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) +
    (SELECT count(*) FROM archived_battles ab 
     WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
     AND (ab.winner_id IS NOT NULL) 
     AND (ab.winner_id <> p.id)) >= 1
  );
  
  GET DIAGNOSTICS v_player_ranking_count = ROW_COUNT;

  -- 2. 投票者ランキングをseason_voter_rankingsに記録
  -- ⚠️ 修正: 投票経験者（season_vote_points >= 1）のみをアーカイブ
  INSERT INTO season_voter_rankings (
    season_id,
    user_id,
    votes,
    rank
  )
  SELECT 
    v_current_season.id,
    id,
    season_vote_points,
    ROW_NUMBER() OVER (ORDER BY season_vote_points DESC, username ASC)
  FROM profiles
  WHERE is_deleted = FALSE
  AND season_vote_points >= 1;  -- 投票経験者のみ（0ポイントを除外）
  
  GET DIAGNOSTICS v_voter_ranking_count = ROW_COUNT;

  -- 3. 現在のシーズンを終了状態に変更
  UPDATE seasons 
  SET 
    status = 'ended',
    end_at = NOW(),
    updated_at = NOW()
  WHERE id = v_current_season.id;

  -- 4. 全ユーザーのシーズンポイントをリセット
  UPDATE profiles 
  SET 
    season_points = 1200,  -- デフォルト値にリセット
    season_vote_points = 0,
    updated_at = NOW()
  WHERE is_deleted = FALSE;

  -- 5. 次のシーズンを自動開始
  -- シーズン番号を取得
  SELECT COALESCE(MAX(
    CASE 
      WHEN name ~ '^[0-9]+-S[0-9]+$' THEN 
        SPLIT_PART(SPLIT_PART(name, '-S', 2), '', 1)::INTEGER
      ELSE 0
    END
  ), 0) + 1 INTO v_next_season_number
  FROM seasons;

  v_new_season_name := '2025-S' || v_next_season_number;

  INSERT INTO seasons (
    name,
    status,
    start_at,
    end_at
  ) VALUES (
    v_new_season_name,
    'active',
    NOW(),
    NOW() + INTERVAL '3 months'
  ) RETURNING id INTO v_new_season_id;

  RETURN json_build_object(
    'success', true,
    'ended_season', json_build_object(
      'id', v_current_season.id,
      'name', v_current_season.name,
      'player_rankings_saved', v_player_ranking_count,
      'voter_rankings_saved', v_voter_ranking_count
    ),
    'new_season', json_build_object(
      'id', v_new_season_id,
      'name', v_new_season_name,
      'start_at', NOW(),
      'end_at', NOW() + INTERVAL '3 months'
    )
  );
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION end_current_season() TO authenticated;

-- コメント追加
COMMENT ON FUNCTION end_current_season() IS 'シーズン終了処理：バトル経験者のみランキング記録・ポイントリセット・次シーズン開始';
