-- 🔧 開発環境のレーティング関数を本番環境に同期
-- 問題: 本番環境でバトル終了時にレーティングとシーズンポイントが更新されない
-- 解決: 開発環境で正常動作している関数を本番環境に適用

-- ✅ 1. update_battle_ratings_safe関数（開発環境版に同期）
CREATE OR REPLACE FUNCTION public.update_battle_ratings_safe(p_battle_id uuid, p_winner_id uuid, p_player1_deleted boolean DEFAULT false, p_player2_deleted boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_battle active_battles;
  v_player1_rating INTEGER;
  v_player2_rating INTEGER;
  v_player1_new_rating INTEGER;
  v_player2_new_rating INTEGER;
  v_player1_change INTEGER;
  v_player2_change INTEGER;
  v_k_factor INTEGER;
BEGIN
  -- Get battle details
  SELECT * INTO v_battle FROM active_battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    -- Try archived battles
    SELECT 
      player1_user_id, player2_user_id, battle_format
    INTO 
      v_battle.player1_user_id, v_battle.player2_user_id, v_battle.battle_format
    FROM archived_battles 
    WHERE original_battle_id = p_battle_id;
  END IF;

  -- Get K-factor for battle format
  SELECT get_k_factor_by_format(v_battle.battle_format) INTO v_k_factor;

  -- Get current ratings (only for non-deleted users)
  IF NOT p_player1_deleted THEN
    SELECT rating INTO v_player1_rating FROM profiles WHERE id = v_battle.player1_user_id;
  END IF;
  
  IF NOT p_player2_deleted THEN
    SELECT rating INTO v_player2_rating FROM profiles WHERE id = v_battle.player2_user_id;
  END IF;

  -- Calculate and update ratings only for non-deleted users
  IF NOT p_player1_deleted AND NOT p_player2_deleted THEN
    -- Both users active: normal rating calculation
    IF p_winner_id = v_battle.player1_user_id THEN
      -- Player 1 wins
      SELECT calculate_elo_rating_change(v_player1_rating, v_player2_rating, 1.0, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_rating, v_player1_rating, 0.0, v_k_factor) INTO v_player2_change;
    ELSIF p_winner_id = v_battle.player2_user_id THEN
      -- Player 2 wins
      SELECT calculate_elo_rating_change(v_player1_rating, v_player2_rating, 0.0, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_rating, v_player1_rating, 1.0, v_k_factor) INTO v_player2_change;
    ELSE
      -- Tie
      SELECT calculate_elo_rating_change(v_player1_rating, v_player2_rating, 0.5, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_rating, v_player1_rating, 0.5, v_k_factor) INTO v_player2_change;
    END IF;

    -- Apply rating changes
    v_player1_new_rating := v_player1_rating + v_player1_change;
    v_player2_new_rating := v_player2_rating + v_player2_change;

    -- Update profiles
    UPDATE profiles SET rating = v_player1_new_rating WHERE id = v_battle.player1_user_id;
    UPDATE profiles SET rating = v_player2_new_rating WHERE id = v_battle.player2_user_id;

  ELSIF NOT p_player1_deleted THEN
    -- Only player 1 active: gets win bonus if they won
    IF p_winner_id = v_battle.player1_user_id THEN
      v_player1_change := v_k_factor / 2; -- Half K-factor bonus for winning against deleted user
    ELSE
      v_player1_change := 0; -- No penalty for losing to deleted user
    END IF;
    
    v_player1_new_rating := v_player1_rating + v_player1_change;
    UPDATE profiles SET rating = v_player1_new_rating WHERE id = v_battle.player1_user_id;
    
  ELSIF NOT p_player2_deleted THEN
    -- Only player 2 active: gets win bonus if they won
    IF p_winner_id = v_battle.player2_user_id THEN
      v_player2_change := v_k_factor / 2; -- Half K-factor bonus for winning against deleted user
    ELSE
      v_player2_change := 0; -- No penalty for losing to deleted user
    END IF;
    
    v_player2_new_rating := v_player2_rating + v_player2_change;
    UPDATE profiles SET rating = v_player2_new_rating WHERE id = v_battle.player2_user_id;
  END IF;

  -- Update archived battle with rating changes
  UPDATE archived_battles 
  SET 
    player1_rating_change = COALESCE(v_player1_change, 0),
    player2_rating_change = COALESCE(v_player2_change, 0),
    player1_final_rating = COALESCE(v_player1_new_rating, v_player1_rating),
    player2_final_rating = COALESCE(v_player2_new_rating, v_player2_rating)
  WHERE original_battle_id = p_battle_id;

  RETURN json_build_object(
    'success', true,
    'player1_rating_change', COALESCE(v_player1_change, 0),
    'player2_rating_change', COALESCE(v_player2_change, 0),
    'player1_new_rating', COALESCE(v_player1_new_rating, v_player1_rating),
    'player2_new_rating', COALESCE(v_player2_new_rating, v_player2_rating),
    'player1_deleted', p_player1_deleted,
    'player2_deleted', p_player2_deleted
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to update ratings safely',
      'error_details', SQLERRM
    );
END;
$function$;

-- ✅ 2. update_season_points_after_battle関数（開発環境版に同期）
CREATE OR REPLACE FUNCTION public.update_season_points_after_battle(p_battle_id uuid, p_winner_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_battle RECORD;
  v_player1_season_points INTEGER;
  v_player2_season_points INTEGER;
  v_player1_new_points INTEGER;
  v_player2_new_points INTEGER;
  v_player1_change INTEGER;
  v_player2_change INTEGER;
  v_k_factor INTEGER;
  v_current_season_id UUID;
  v_player1_deleted BOOLEAN := FALSE;
  v_player2_deleted BOOLEAN := FALSE;
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
    ab.battle_format
  INTO v_battle
  FROM archived_battles ab
  WHERE ab.original_battle_id = p_battle_id
  OR ab.id = p_battle_id;
  
  IF NOT FOUND THEN
    -- active_battlesからも探す
    SELECT 
      player1_user_id,
      player2_user_id,
      battle_format
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

  -- ✅ 削除ユーザーチェック（レーティング更新と同じロジック）
  SELECT COALESCE(is_deleted, false) INTO v_player1_deleted
  FROM profiles
  WHERE id = v_battle.player1_user_id;
  
  SELECT COALESCE(is_deleted, false) INTO v_player2_deleted
  FROM profiles
  WHERE id = v_battle.player2_user_id;

  -- バトル形式別Kファクターを取得（レーティング更新と同じ）
  SELECT get_k_factor_by_format(v_battle.battle_format) INTO v_k_factor;

  -- ✅ シーズンポイントを取得（削除されていないユーザーのみ）
  IF NOT v_player1_deleted THEN
    SELECT season_points INTO v_player1_season_points 
    FROM profiles WHERE id = v_battle.player1_user_id;
  END IF;
  
  IF NOT v_player2_deleted THEN
    SELECT season_points INTO v_player2_season_points 
    FROM profiles WHERE id = v_battle.player2_user_id;
  END IF;

  -- ✅ シーズンポイント計算（レーティング更新と完全同じロジック）
  IF NOT v_player1_deleted AND NOT v_player2_deleted THEN
    -- 両ユーザーアクティブ: 通常のElo計算
    IF p_winner_id = v_battle.player1_user_id THEN
      -- Player 1 勝利
      SELECT calculate_elo_rating_change(v_player1_season_points, v_player2_season_points, 1.0, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_season_points, v_player1_season_points, 0.0, v_k_factor) INTO v_player2_change;
    ELSIF p_winner_id = v_battle.player2_user_id THEN
      -- Player 2 勝利
      SELECT calculate_elo_rating_change(v_player1_season_points, v_player2_season_points, 0.0, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_season_points, v_player1_season_points, 1.0, v_k_factor) INTO v_player2_change;
    ELSE
      -- 引き分け
      SELECT calculate_elo_rating_change(v_player1_season_points, v_player2_season_points, 0.5, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_season_points, v_player1_season_points, 0.5, v_k_factor) INTO v_player2_change;
    END IF;

    -- シーズンポイント変更を適用（最低1100で制限）
    v_player1_new_points := GREATEST(v_player1_season_points + v_player1_change, 1100);
    v_player2_new_points := GREATEST(v_player2_season_points + v_player2_change, 1100);

    -- プロフィール更新
    UPDATE profiles SET season_points = v_player1_new_points WHERE id = v_battle.player1_user_id;
    UPDATE profiles SET season_points = v_player2_new_points WHERE id = v_battle.player2_user_id;

  ELSIF NOT v_player1_deleted THEN
    -- ✅ Player1のみアクティブ: 勝利時に半分Kファクターボーナス（レーティングと同じ）
    IF p_winner_id = v_battle.player1_user_id THEN
      v_player1_change := v_k_factor / 2; -- 半分Kファクターボーナス
    ELSE
      v_player1_change := 0; -- 削除ユーザーに負けてもペナルティなし
    END IF;
    
    v_player1_new_points := GREATEST(v_player1_season_points + v_player1_change, 1100);
    UPDATE profiles SET season_points = v_player1_new_points WHERE id = v_battle.player1_user_id;
    
  ELSIF NOT v_player2_deleted THEN
    -- ✅ Player2のみアクティブ: 勝利時に半分Kファクターボーナス（レーティングと同じ）
    IF p_winner_id = v_battle.player2_user_id THEN
      v_player2_change := v_k_factor / 2; -- 半分Kファクターボーナス
    ELSE
      v_player2_change := 0; -- 削除ユーザーに負けてもペナルティなし
    END IF;
    
    v_player2_new_points := GREATEST(v_player2_season_points + v_player2_change, 1100);
    UPDATE profiles SET season_points = v_player2_new_points WHERE id = v_battle.player2_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'season_id', v_current_season_id,
    'battle_format', v_battle.battle_format,
    'k_factor_used', v_k_factor,
    'is_tie', (p_winner_id IS NULL),
    'player1_deleted', v_player1_deleted,
    'player2_deleted', v_player2_deleted,
    'player1_points', json_build_object(
      'old_points', COALESCE(v_player1_season_points, 0),
      'change', COALESCE(v_player1_change, 0),
      'new_points', COALESCE(v_player1_new_points, v_player1_season_points, 0)
    ),
    'player2_points', json_build_object(
      'old_points', COALESCE(v_player2_season_points, 0),
      'change', COALESCE(v_player2_change, 0),
      'new_points', COALESCE(v_player2_new_points, v_player2_season_points, 0)
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to update season points',
      'error_details', SQLERRM
    );
END;
$function$;

-- ✅ 3. complete_battle_with_video_archiving関数（開発環境版に同期）
CREATE OR REPLACE FUNCTION public.complete_battle_with_video_archiving(p_battle_id uuid, p_winner_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_battle active_battles;
  v_archived_id UUID;
  v_player1_video_url TEXT;
  v_player2_video_url TEXT;
  v_player1_deleted BOOLEAN := FALSE;
  v_player2_deleted BOOLEAN := FALSE;
  v_rating_result JSON;
  v_season_points_result JSON;
  v_season_id UUID;
BEGIN
  -- Get battle details
  SELECT * INTO v_battle
  FROM active_battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found'
    );
  END IF;

  -- Check if players are deleted
  SELECT COALESCE(is_deleted, false) INTO v_player1_deleted
  FROM profiles
  WHERE id = v_battle.player1_user_id;
  
  SELECT COALESCE(is_deleted, false) INTO v_player2_deleted
  FROM profiles
  WHERE id = v_battle.player2_user_id;

  -- Get video URLs from submissions (この部分が重要！)
  SELECT video_url INTO v_player1_video_url
  FROM submissions
  WHERE id = v_battle.player1_submission_id;
  
  SELECT video_url INTO v_player2_video_url
  FROM submissions
  WHERE id = v_battle.player2_submission_id;

  -- Get current season ID
  SELECT id INTO v_season_id
  FROM seasons
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Archive the battle with permanent video URLs
  INSERT INTO archived_battles (
    original_battle_id,
    winner_id,
    final_votes_a,
    final_votes_b,
    battle_format,
    player1_user_id,
    player2_user_id,
    player1_submission_id,
    player2_submission_id,
    player1_video_url,  -- ✅ 動画URL保存
    player2_video_url,  -- ✅ 動画URL保存
    season_id,
    archived_at
  ) VALUES (
    v_battle.id,
    p_winner_id,
    v_battle.votes_a,
    v_battle.votes_b,
    v_battle.battle_format,
    v_battle.player1_user_id,
    v_battle.player2_user_id,
    v_battle.player1_submission_id,
    v_battle.player2_submission_id,
    v_player1_video_url,  -- ✅ 実際の動画URLを保存
    v_player2_video_url,  -- ✅ 実際の動画URLを保存
    v_season_id,
    NOW()
  ) RETURNING id INTO v_archived_id;

  -- Copy votes to archived_battle_votes for permanent storage
  INSERT INTO archived_battle_votes (
    archived_battle_id,
    user_id,
    vote,
    comment,
    created_at
  )
  SELECT 
    v_archived_id,
    user_id,
    vote,
    comment,
    created_at
  FROM battle_votes
  WHERE battle_id = p_battle_id;

  -- Update submissions status
  UPDATE submissions
  SET 
    status = 'BATTLE_ENDED',
    updated_at = NOW()
  WHERE id IN (v_battle.player1_submission_id, v_battle.player2_submission_id);

  -- Update ratings only for non-deleted users
  IF NOT v_player1_deleted OR NOT v_player2_deleted THEN
    SELECT update_battle_ratings_safe(v_battle.id, p_winner_id, v_player1_deleted, v_player2_deleted) INTO v_rating_result;
  ELSE
    v_rating_result := json_build_object('message', 'No rating update - both users deleted');
  END IF;

  -- Update season points
  SELECT update_season_points_after_battle(v_battle.id, p_winner_id) INTO v_season_points_result;

  -- Delete from active battles
  DELETE FROM battle_votes WHERE battle_id = p_battle_id;
  DELETE FROM active_battles WHERE id = p_battle_id;

  RETURN json_build_object(
    'success', true,
    'archived_battle_id', v_archived_id,
    'winner_id', p_winner_id,
    'final_votes_a', v_battle.votes_a,
    'final_votes_b', v_battle.votes_b,
    'player1_video_url', v_player1_video_url,  -- ✅ レスポンスに含める
    'player2_video_url', v_player2_video_url,  -- ✅ レスポンスに含める
    'player1_deleted', v_player1_deleted,
    'player2_deleted', v_player2_deleted,
    'rating_update', v_rating_result,
    'season_points_update', v_season_points_result
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to complete battle with video archiving',
      'error_details', SQLERRM
    );
END;
$function$;

-- ✅ 4. process_expired_battles関数（開発環境版に同期）
CREATE OR REPLACE FUNCTION public.process_expired_battles()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  rec RECORD;
  v_winner_id UUID;
  v_is_tie BOOLEAN;
  v_result JSON;
BEGIN
  -- Loop through active battles that have passed their voting end time
  FOR rec IN
    SELECT id, player1_user_id, player2_user_id, votes_a, votes_b
    FROM public.active_battles
    WHERE end_voting_at < now() AND status = 'ACTIVE'
  LOOP
    BEGIN
      -- Mark the battle as 'PROCESSING_RESULTS' to prevent double-processing
      UPDATE public.active_battles
      SET status = 'PROCESSING_RESULTS', updated_at = now()
      WHERE id = rec.id;

      -- Determine the winner or if it's a tie
      IF rec.votes_a > rec.votes_b THEN
        v_winner_id := rec.player1_user_id;
        v_is_tie := FALSE;
      ELSIF rec.votes_b > rec.votes_a THEN
        v_winner_id := rec.player2_user_id;
        v_is_tie := FALSE;
      ELSE
        v_winner_id := NULL; -- It's a tie
        v_is_tie := TRUE;
      END IF;

      -- ✅ 新しい動画URL保存付きの関数を使用
      SELECT complete_battle_with_video_archiving(rec.id, v_winner_id) INTO v_result;

      -- Log successful completion
      RAISE NOTICE 'Battle % completed successfully with video URLs: %', rec.id, v_result;

    EXCEPTION WHEN OTHERS THEN
      -- If any error occurs, log it and revert the status to 'ACTIVE' for a retry
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
      UPDATE public.active_battles
      SET status = 'ACTIVE'
      WHERE id = rec.id AND status = 'PROCESSING_RESULTS';
    END;
  END LOOP;
END;
$function$; 