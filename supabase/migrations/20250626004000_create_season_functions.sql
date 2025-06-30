/*
  # シーズン制バックエンド関数群の実装
  
  シーズンポイント加算ロジックとシーズン管理機能を実装。
  既存のKファクターシステム（global_rating用）と同じ仕組みを利用してseason_pointsも計算。
  
  ## 主要機能
  1. シーズンポイント更新関数（global_ratingと同じKファクター・Elo計算利用）
  2. 投票時のseason_vote_points加算機能
  3. バトル完了時の統合レーティング・ポイント更新
  4. シーズン終了時の自動処理機能
  5. アクティブシーズン管理機能
*/

-- ====================
-- シーズンポイント計算関数群
-- ====================

-- シーズンポイント更新関数（global_ratingと同じKファクター・計算式を利用）
CREATE OR REPLACE FUNCTION update_season_points_after_battle(
  p_battle_id UUID,
  p_winner_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_battle RECORD;
  v_player1_season_points INTEGER;
  v_player2_season_points INTEGER;
  v_player1_new_points INTEGER;
  v_player2_new_points INTEGER;
  v_k_factor INTEGER;
  v_player1_change INTEGER;
  v_player2_change INTEGER;
  v_is_tie BOOLEAN;
  v_current_season_id UUID;
BEGIN
  -- アクティブシーズンを取得
  SELECT id INTO v_current_season_id 
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_current_season_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'アクティブなシーズンが見つかりません'
    );
  END IF;

  -- バトル情報を取得（archived_battlesから）
  SELECT 
    ab.player1_user_id,
    ab.player2_user_id,
    ab.battle_format,
    ab.final_votes_a as votes_a,
    ab.final_votes_b as votes_b
  INTO v_battle
  FROM archived_battles ab
  WHERE ab.original_battle_id = p_battle_id
  OR ab.id = p_battle_id;
  
  IF NOT FOUND THEN
    -- active_battlesからも探す
    SELECT 
      player1_user_id,
      player2_user_id,
      battle_format,
      votes_a,
      votes_b
    INTO v_battle
    FROM active_battles
    WHERE id = p_battle_id;
  END IF;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'battle_not_found',
      'message', 'バトルが見つかりません'
    );
  END IF;

  -- 現在のシーズンポイントを取得
  SELECT season_points INTO v_player1_season_points 
  FROM profiles WHERE id = v_battle.player1_user_id;
  
  SELECT season_points INTO v_player2_season_points 
  FROM profiles WHERE id = v_battle.player2_user_id;

  -- バトル形式別Kファクターを取得（既存システムと同じ）
  v_k_factor := get_k_factor_by_format(v_battle.battle_format::text);

  -- 引き分け判定
  v_is_tie := (v_battle.votes_a = v_battle.votes_b);

  IF v_is_tie THEN
    -- 引き分けの場合：両者0.5の結果でElo計算
    v_player1_change := calculate_elo_rating_change(
      v_player1_season_points, 
      v_player2_season_points, 
      0.5, 
      v_k_factor
    );
    v_player2_change := calculate_elo_rating_change(
      v_player2_season_points, 
      v_player1_season_points, 
      0.5, 
      v_k_factor
    );
  ELSE
    -- 勝敗が決まった場合
    IF p_winner_id = v_battle.player1_user_id THEN
      -- Player1勝利
      v_player1_change := calculate_elo_rating_change(
        v_player1_season_points, 
        v_player2_season_points, 
        1.0, 
        v_k_factor
      );
      v_player2_change := calculate_elo_rating_change(
        v_player2_season_points, 
        v_player1_season_points, 
        0.0, 
        v_k_factor
      );
    ELSIF p_winner_id = v_battle.player2_user_id THEN
      -- Player2勝利
      v_player1_change := calculate_elo_rating_change(
        v_player1_season_points, 
        v_player2_season_points, 
        0.0, 
        v_k_factor
      );
      v_player2_change := calculate_elo_rating_change(
        v_player2_season_points, 
        v_player1_season_points, 
        1.0, 
        v_k_factor
      );
    ELSE
      -- winner_idがNULLで引き分けでもない場合は引き分け扱い
      v_player1_change := calculate_elo_rating_change(
        v_player1_season_points, 
        v_player2_season_points, 
        0.5, 
        v_k_factor
      );
      v_player2_change := calculate_elo_rating_change(
        v_player2_season_points, 
        v_player1_season_points, 
        0.5, 
        v_k_factor
      );
    END IF;
  END IF;

  -- 新しいシーズンポイントを計算（最低1100で制限）
  v_player1_new_points := GREATEST(v_player1_season_points + v_player1_change, 1100);
  v_player2_new_points := GREATEST(v_player2_season_points + v_player2_change, 1100);

  -- シーズンポイントを更新
  UPDATE profiles 
  SET 
    season_points = v_player1_new_points,
    updated_at = NOW()
  WHERE id = v_battle.player1_user_id;

  UPDATE profiles 
  SET 
    season_points = v_player2_new_points,
    updated_at = NOW()
  WHERE id = v_battle.player2_user_id;

  RETURN json_build_object(
    'success', true,
    'season_id', v_current_season_id,
    'battle_format', v_battle.battle_format,
    'k_factor_used', v_k_factor,
    'is_tie', v_is_tie,
    'player1_points', json_build_object(
      'old_points', v_player1_season_points,
      'change', v_player1_change,
      'new_points', v_player1_new_points
    ),
    'player2_points', json_build_object(
      'old_points', v_player2_season_points,
      'change', v_player2_change,
      'new_points', v_player2_new_points
    )
  );
END;
$$;

-- ====================
-- 投票時シーズン投票ポイント加算関数
-- ====================

-- 投票時にseason_vote_pointsを加算する関数
CREATE OR REPLACE FUNCTION increment_season_vote_points(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_season_vote_points INTEGER;
  v_new_season_vote_points INTEGER;
  v_current_season_id UUID;
BEGIN
  -- アクティブシーズンを取得
  SELECT id INTO v_current_season_id 
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_current_season_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'アクティブなシーズンが見つかりません'
    );
  END IF;

  -- 現在のシーズン投票ポイントを取得して1増加
  SELECT season_vote_points INTO v_current_season_vote_points 
  FROM profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', 'ユーザーが見つかりません'
    );
  END IF;

  v_new_season_vote_points := COALESCE(v_current_season_vote_points, 0) + 1;

  -- season_vote_pointsを更新
  UPDATE profiles 
  SET 
    season_vote_points = v_new_season_vote_points,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'season_id', v_current_season_id,
    'user_id', p_user_id,
    'old_vote_points', COALESCE(v_current_season_vote_points, 0),
    'new_vote_points', v_new_season_vote_points
  );
END;
$$;

-- ====================
-- 統合バトル完了処理関数（global_rating + season_points両方更新）
-- ====================

-- バトル完了時にglobal_ratingとseason_pointsの両方を更新する統合関数
CREATE OR REPLACE FUNCTION complete_battle_with_season_update(
  p_battle_id UUID,
  p_winner_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_global_rating_result JSON;
  v_season_points_result JSON;
  v_current_season_id UUID;
BEGIN
  -- アクティブシーズンを取得
  SELECT id INTO v_current_season_id 
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 1. 既存のglobal_rating更新（既存システム）
  BEGIN
    SELECT update_battle_ratings_safe(p_battle_id, p_winner_id) INTO v_global_rating_result;
  EXCEPTION WHEN OTHERS THEN
    v_global_rating_result := json_build_object(
      'success', false,
      'error', 'global_rating_update_failed',
      'message', SQLERRM
    );
  END;

  -- 2. 新しいseason_points更新（シーズン制）
  BEGIN
    IF v_current_season_id IS NOT NULL THEN
      SELECT update_season_points_after_battle(p_battle_id, p_winner_id) INTO v_season_points_result;
    ELSE
      v_season_points_result := json_build_object(
        'success', false,
        'error', 'no_active_season',
        'message', 'アクティブなシーズンがないためシーズンポイント更新をスキップ'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_season_points_result := json_build_object(
      'success', false,
      'error', 'season_points_update_failed',
      'message', SQLERRM
    );
  END;

  RETURN json_build_object(
    'success', true,
    'battle_id', p_battle_id,
    'winner_id', p_winner_id,
    'current_season_id', v_current_season_id,
    'global_rating_update', v_global_rating_result,
    'season_points_update', v_season_points_result
  );
END;
$$;

-- ====================
-- シーズン管理関数群
-- ====================

-- アクティブシーズン取得関数
CREATE OR REPLACE FUNCTION get_active_season()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season RECORD;
BEGIN
  SELECT * INTO v_season
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

  RETURN json_build_object(
    'success', true,
    'season', json_build_object(
      'id', v_season.id,
      'name', v_season.name,
      'status', v_season.status,
      'start_at', v_season.start_at,
      'end_at', v_season.end_at,
      'created_at', v_season.created_at,
      'updated_at', v_season.updated_at
    )
  );
END;
$$;

-- シーズン終了関数（順位記録 + ポイントリセット）
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
  INSERT INTO season_rankings (
    season_id,
    user_id,
    final_season_points,
    final_position
  )
  SELECT 
    v_current_season.id,
    id,
    season_points,
    ROW_NUMBER() OVER (ORDER BY season_points DESC, username ASC)
  FROM profiles
  WHERE is_deleted = FALSE
  AND season_points > 0;
  
  GET DIAGNOSTICS v_player_ranking_count = ROW_COUNT;

  -- 2. 投票者ランキングをseason_voter_rankingsに記録
  INSERT INTO season_voter_rankings (
    season_id,
    user_id,
    final_season_vote_points,
    final_position
  )
  SELECT 
    v_current_season.id,
    id,
    season_vote_points,
    ROW_NUMBER() OVER (ORDER BY season_vote_points DESC, username ASC)
  FROM profiles
  WHERE is_deleted = FALSE
  AND season_vote_points > 0;
  
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
    ),
    'users_reset', 'All season points reset to 1200, vote points reset to 0'
  );
END;
$$;

-- ====================
-- 権限設定
-- ====================

-- シーズンポイント関数の権限
GRANT EXECUTE ON FUNCTION update_season_points_after_battle(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_season_vote_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_battle_with_season_update(UUID, UUID) TO authenticated;

-- シーズン管理関数の権限
GRANT EXECUTE ON FUNCTION get_active_season() TO authenticated;
GRANT EXECUTE ON FUNCTION end_current_season() TO authenticated; -- 管理者のみに制限したい場合は後で調整

-- ====================
-- コメント
-- ====================

COMMENT ON FUNCTION update_season_points_after_battle(UUID, UUID) IS 'バトル完了後のシーズンポイント更新：global_ratingと同じKファクター・Elo計算式を使用';
COMMENT ON FUNCTION increment_season_vote_points(UUID) IS '投票時のシーズン投票ポイント加算：1票につき1ポイント増加';
COMMENT ON FUNCTION complete_battle_with_season_update(UUID, UUID) IS 'バトル完了時の統合処理：global_ratingとseason_pointsの両方を更新';
COMMENT ON FUNCTION get_active_season() IS 'アクティブシーズン情報取得';
COMMENT ON FUNCTION end_current_season() IS 'シーズン終了処理：ランキング記録・ポイントリセット・次シーズン開始'; 