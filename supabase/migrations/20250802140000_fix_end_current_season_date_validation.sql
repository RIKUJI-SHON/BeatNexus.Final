-- Fix end_current_season function to only end seasons that have passed their end_at timestamp
-- Bug Fix: Previous version terminated active seasons regardless of their scheduled end time
-- This fix ensures seasons are only terminated after their end_at timestamp

CREATE OR REPLACE FUNCTION public.end_current_season()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_season RECORD;
  v_player_ranking_count INTEGER := 0;
  v_voter_ranking_count INTEGER := 0;
  
  -- 新規追加変数（強制終了処理用）
  v_active_battle RECORD;
  v_winner_id UUID;
  v_force_end_result JSON;
  v_forced_battles_count INTEGER := 0;
  v_forced_battles_errors INTEGER := 0;
  v_forced_battles_details JSON[] := ARRAY[]::JSON[];
  v_forced_battles_errors_details JSON[] := ARRAY[]::JSON[];
BEGIN
  -- 修正: 終了時刻を過ぎたアクティブシーズンのみを取得
  SELECT * INTO v_current_season
  FROM seasons 
  WHERE status = 'active'
  AND end_at <= NOW()  -- ← 重要: 終了時刻を過ぎたシーズンのみ
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- より詳細なエラーメッセージを提供
    DECLARE
      v_active_season_count INTEGER;
      v_future_season RECORD;
    BEGIN
      -- アクティブなシーズンの総数をチェック
      SELECT COUNT(*) INTO v_active_season_count
      FROM seasons 
      WHERE status = 'active';
      
      IF v_active_season_count = 0 THEN
        RETURN json_build_object(
          'success', false,
          'error', 'no_active_season',
          'message', 'アクティブなシーズンが見つかりません'
        );
      ELSE
        -- 将来の終了予定のアクティブシーズンを取得
        SELECT * INTO v_future_season
        FROM seasons 
        WHERE status = 'active'
        AND end_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1;
        
        RETURN json_build_object(
          'success', false,
          'error', 'season_not_yet_ended',
          'message', FORMAT(
            'アクティブなシーズン「%s」はまだ終了時刻に達していません（終了予定: %s、現在時刻: %s）',
            v_future_season.name,
            v_future_season.end_at,
            NOW()
          ),
          'season_info', json_build_object(
            'id', v_future_season.id,
            'name', v_future_season.name,
            'end_at', v_future_season.end_at,
            'current_time', NOW(),
            'remaining_time', v_future_season.end_at - NOW()
          )
        );
      END IF;
    END;
  END IF;

  -- 【新規】Phase 0: アクティブバトル強制終了処理
  RAISE NOTICE 'Starting Phase 0: Force-ending active battles during season end';
  
  FOR v_active_battle IN
    SELECT 
      id, 
      player1_user_id, 
      player2_user_id, 
      votes_a, 
      votes_b,
      battle_format,
      end_voting_at,
      created_at
    FROM public.active_battles
    WHERE status = 'ACTIVE' 
      AND end_voting_at > NOW()  -- まだ投票期間中
    ORDER BY created_at ASC  -- 古いバトルから処理
  LOOP
    BEGIN
      RAISE NOTICE 'Processing battle % with votes A:% B:%', 
        v_active_battle.id, v_active_battle.votes_a, v_active_battle.votes_b;
      
      -- 勝敗判定（process_expired_battlesと同じロジック）
      IF v_active_battle.votes_a > v_active_battle.votes_b THEN
        v_winner_id := v_active_battle.player1_user_id;
      ELSIF v_active_battle.votes_b > v_active_battle.votes_a THEN
        v_winner_id := v_active_battle.player2_user_id;
      ELSE
        v_winner_id := NULL; -- 引き分け
      END IF;

      -- バトル完了処理（complete_battle_with_video_archivingを使用）
      SELECT complete_battle_with_video_archiving(
        v_active_battle.id, 
        v_winner_id
      ) INTO v_force_end_result;

      -- 処理結果を確認
      IF (v_force_end_result->>'success')::boolean = true THEN
        -- 成功カウント・詳細記録
        v_forced_battles_count := v_forced_battles_count + 1;
        v_forced_battles_details := v_forced_battles_details || json_build_object(
          'battle_id', v_active_battle.id,
          'winner_id', v_winner_id,
          'votes_a', v_active_battle.votes_a,
          'votes_b', v_active_battle.votes_b,
          'original_end_time', v_active_battle.end_voting_at,
          'forced_end_time', NOW(),
          'battle_format', v_active_battle.battle_format,
          'completion_result', v_force_end_result
        );
        
        RAISE NOTICE 'Battle % successfully force-ended with winner: %', 
          v_active_battle.id, COALESCE(v_winner_id::text, 'TIE');
          
        -- シーズン終了による強制終了の追加通知を送信
        -- プレイヤー1への追加通知
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          related_battle_id,
          is_read,
          created_at,
          updated_at
        ) VALUES (
          v_active_battle.player1_user_id,
          'シーズン終了によるバトル強制終了',
          'シーズン終了に伴い、進行中のバトルが強制的に終了されました。投票期間の途中でしたが、その時点での投票数で勝敗が決定されました。',
          'info',
          v_active_battle.id,
          false,
          NOW(),
          NOW()
        );

        -- プレイヤー2への追加通知
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          related_battle_id,
          is_read,
          created_at,
          updated_at
        ) VALUES (
          v_active_battle.player2_user_id,
          'シーズン終了によるバトル強制終了',
          'シーズン終了に伴い、進行中のバトルが強制的に終了されました。投票期間の途中でしたが、その時点での投票数で勝敗が決定されました。',
          'info',
          v_active_battle.id,
          false,
          NOW(),
          NOW()
        );
        
      ELSE
        -- complete_battle_with_video_archiving が失敗した場合
        RAISE NOTICE 'Battle % completion failed: %', 
          v_active_battle.id, v_force_end_result->>'error';
        RAISE EXCEPTION 'Battle completion failed: %', v_force_end_result->>'error';
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- エラー時の処理
      v_forced_battles_errors := v_forced_battles_errors + 1;
      v_forced_battles_errors_details := v_forced_battles_errors_details || json_build_object(
        'battle_id', v_active_battle.id,
        'error_message', SQLERRM,
        'error_time', NOW(),
        'battle_details', json_build_object(
          'votes_a', v_active_battle.votes_a,
          'votes_b', v_active_battle.votes_b,
          'end_voting_at', v_active_battle.end_voting_at,
          'battle_format', v_active_battle.battle_format
        )
      );
      
      -- エラーログ出力
      RAISE NOTICE 'Error force-ending battle % during season end: %', 
        v_active_battle.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Phase 0 completed: % battles processed, % errors', 
    v_forced_battles_count, v_forced_battles_errors;

  -- 【既存】Phase 1: バトルランキングをseason_rankingsに記録
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
    RANK() OVER (ORDER BY p.season_points DESC)  -- 同ポイント時は同順位
  FROM profiles p
  WHERE p.is_deleted = FALSE
  AND (
    -- バトル経験者のみ: 勝利数 + 敗北数 >= 1
    (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) +
    (SELECT count(*) FROM archived_battles ab 
     WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
     AND (ab.winner_id IS NOT NULL) 
     AND (ab.winner_id <> p.id)) >= 1
  )
  ORDER BY p.season_points DESC, p.username ASC;  -- 表示順序用
  
  GET DIAGNOSTICS v_player_ranking_count = ROW_COUNT;

  -- 【既存】Phase 2: 投票者ランキングをseason_voter_rankingsに記録
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
    RANK() OVER (ORDER BY season_vote_points DESC)  -- 同ポイント時は同順位
  FROM profiles
  WHERE is_deleted = FALSE
  AND season_vote_points >= 1
  ORDER BY season_vote_points DESC, username ASC;  -- 表示順序用
  
  GET DIAGNOSTICS v_voter_ranking_count = ROW_COUNT;

  -- 【既存】Phase 3: 現在のシーズンを終了状態に変更
  UPDATE seasons 
  SET 
    status = 'ended',
    end_at = NOW(),
    updated_at = NOW()
  WHERE id = v_current_season.id;

  -- 【既存】Phase 4: 全ユーザーのシーズンポイントをリセット
  UPDATE profiles 
  SET 
    season_points = 1200,
    season_vote_points = 0,
    updated_at = NOW()
  WHERE is_deleted = FALSE;

  -- 拡張された成功レスポンス
  RETURN json_build_object(
    'success', true,
    'forced_battles', json_build_object(
      'processed_count', v_forced_battles_count,
      'error_count', v_forced_battles_errors,
      'details', v_forced_battles_details,
      'errors', v_forced_battles_errors_details
    ),
    'ended_season', json_build_object(
      'id', v_current_season.id,
      'name', v_current_season.name,
      'player_rankings_saved', v_player_ranking_count,
      'voter_rankings_saved', v_voter_ranking_count,
      'ended_at', NOW()
    ),
    'message', FORMAT(
      'シーズンが正常に終了しました。アクティブバトル%s件を強制終了しました。新しいシーズンを開始するには start_new_season() 関数を実行してください。',
      v_forced_battles_count
    )
  );
END;
$$;

-- Add a comment to explain the fix
COMMENT ON FUNCTION public.end_current_season() IS 
'Ends the current active season, but only if the season has passed its scheduled end_at timestamp. 
This prevents premature termination of seasons that are still within their scheduled time period.
Updated on 2025-08-02 to fix date validation bug.';
