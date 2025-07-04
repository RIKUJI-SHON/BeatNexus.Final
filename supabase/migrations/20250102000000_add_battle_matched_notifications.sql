-- 🎯 BeatNexus マッチング通知システム実装
-- バトルマッチング成功時に両プレイヤーに通知を送信

-- 1. find_match_and_create_battle 関数を更新（マッチング通知追加）
CREATE OR REPLACE FUNCTION find_match_and_create_battle(p_submission_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission submissions;
  v_opponent submissions;
  v_battle_id UUID;
  v_voting_end_time TIMESTAMPTZ;
  v_submitter_rating INTEGER;
  v_opponent_rating INTEGER;
  v_rating_diff INTEGER;
  v_submitter_username TEXT;
  v_opponent_username TEXT;
BEGIN
  -- Get the submission details
  SELECT * INTO v_submission
  FROM public.submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Submission not found'
    );
  END IF;

  -- Get submitter's rating and username
  SELECT rating, username INTO v_submitter_rating, v_submitter_username
  FROM public.profiles
  WHERE id = v_submission.user_id;

  -- Only process if submission is waiting for opponent
  IF v_submission.status != 'WAITING_OPPONENT' THEN
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Submission is not waiting for opponent',
      'current_status', v_submission.status
    );
  END IF;

  -- Find an opponent with same battle format and similar rating (strict initial matching: ±50)
  SELECT s.* INTO v_opponent
  FROM public.submissions s
  JOIN public.profiles p ON s.user_id = p.id
  WHERE s.battle_format = v_submission.battle_format
    AND s.status = 'WAITING_OPPONENT'
    AND s.user_id != v_submission.user_id
    AND s.id != p_submission_id
    AND ABS(p.rating - v_submitter_rating) <= 50  -- 初期マッチング: ±50レート制限
  ORDER BY 
    ABS(p.rating - v_submitter_rating) ASC,  -- レート差最小優先
    s.created_at ASC  -- 同じレート差なら先着順
  LIMIT 1;

  -- If no opponent found with strict rating, try with relaxed rating (±100)
  IF NOT FOUND THEN
    SELECT s.* INTO v_opponent
    FROM public.submissions s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.battle_format = v_submission.battle_format
      AND s.status = 'WAITING_OPPONENT'
      AND s.user_id != v_submission.user_id
      AND s.id != p_submission_id
      AND ABS(p.rating - v_submitter_rating) <= 100  -- 緩和された制限: ±100
    ORDER BY 
      ABS(p.rating - v_submitter_rating) ASC,
      s.created_at ASC
    LIMIT 1;
  END IF;

  -- If still no opponent found, submission stays waiting for progressive matching
  IF NOT FOUND THEN
    RETURN json_build_object(
      'battle_created', false,
      'message', 'No suitable opponent found within rating range, submission waiting for progressive matching',
      'waiting', true,
      'submitter_rating', v_submitter_rating,
      'max_rating_diff_tried', 100
    );
  END IF;

  -- Get opponent's rating and username
  SELECT rating, username INTO v_opponent_rating, v_opponent_username
  FROM public.profiles
  WHERE id = v_opponent.user_id;

  -- Calculate rating difference
  v_rating_diff := ABS(v_submitter_rating - v_opponent_rating);

  -- 投票期間を5日間に変更
  v_voting_end_time := NOW() + INTERVAL '5 days';

  -- Create the battle record
  INSERT INTO public.active_battles (
    player1_submission_id,
    player2_submission_id,
    player1_user_id,
    player2_user_id,
    battle_format,
    status,
    votes_a,
    votes_b,
    end_voting_at,
    created_at,
    updated_at
  ) VALUES (
    v_submission.id,
    v_opponent.id,
    v_submission.user_id,
    v_opponent.user_id,
    v_submission.battle_format,
    'ACTIVE',
    0,
    0,
    v_voting_end_time,
    NOW(),
    NOW()
  ) RETURNING id INTO v_battle_id;

  -- Update submissions to matched
  UPDATE public.submissions
  SET
    status = 'MATCHED_IN_BATTLE',
    active_battle_id = v_battle_id,
    updated_at = NOW()
  WHERE id IN (v_submission.id, v_opponent.id);

  -- ✅ 新機能: マッチング通知をプレイヤー両方に送信
  -- 投稿者（p_submission_id のオーナー）への通知
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
    v_submission.user_id,
    'バトルマッチングが完了しました！',
    FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は5日間です。', v_opponent_username),
    'battle_matched',
    v_battle_id,
    false,
    NOW(),
    NOW()
  );

  -- 相手（v_opponent のオーナー）への通知
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
    v_opponent.user_id,
    'バトルマッチングが完了しました！',
    FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は5日間です。', v_submitter_username),
    'battle_matched',
    v_battle_id,
    false,
    NOW(),
    NOW()
  );

  -- Return success with detailed matching info
  RETURN json_build_object(
    'battle_created', true,
    'battle_id', v_battle_id,
    'opponent_id', v_opponent.user_id,
    'voting_ends_at', v_voting_end_time,
    'message', 'Battle created successfully with 5-day voting period',
    'notifications_sent', 2,
    'match_details', json_build_object(
      'submitter_rating', v_submitter_rating,
      'opponent_rating', v_opponent_rating,
      'rating_difference', v_rating_diff,
      'match_type', 'immediate_edge_function',
      'voting_period_days', 5
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Database error occurred',
      'error_details', SQLERRM
    );
END;
$$;

-- 2. progressive_matchmaking 関数を更新（マッチング通知追加）
CREATE OR REPLACE FUNCTION progressive_matchmaking()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission_rec RECORD;
  v_opponent_rec RECORD;
  v_battle_id UUID;
  v_voting_end_time TIMESTAMPTZ;
  v_processed_count INTEGER := 0;
  v_matched_count INTEGER := 0;
  v_results JSON[] := '{}';
  v_match_result JSON;
  v_rating_tolerance INTEGER;
  v_waiting_hours NUMERIC;
  v_submitter_rating INTEGER;
  v_opponent_rating INTEGER;
  v_submitter_username TEXT;
  v_opponent_username TEXT;
BEGIN
  -- 初期待機期間を10分に設定（即座マッチングの猶予期間）
  FOR v_submission_rec IN
    SELECT 
      s.id,
      s.user_id,
      s.created_at,
      s.battle_format,
      s.video_url,
      p.rating,
      p.username,
      EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 3600 as waiting_hours
    FROM public.submissions s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.status = 'WAITING_OPPONENT'
      AND s.created_at + INTERVAL '10 minutes' <= NOW()  -- 初期待機10分
    ORDER BY s.created_at ASC
  LOOP
    v_processed_count := v_processed_count + 1;
    v_waiting_hours := v_submission_rec.waiting_hours;
    v_submitter_rating := v_submission_rec.rating;
    v_submitter_username := v_submission_rec.username;
    
    -- 🎯 理想的な時間ベース許容レート差システム
    IF v_waiting_hours < 6 THEN
      v_rating_tolerance := 50;   -- 0-6時間: ±50（新鮮な対戦はほぼ同格同士）
    ELSIF v_waiting_hours < 24 THEN
      v_rating_tolerance := 100;  -- 6-24時間: ±100（少し幅を持たせてマッチ確率UP）
    ELSIF v_waiting_hours < 72 THEN
      v_rating_tolerance := 200;  -- 24-72時間: ±200（24時間以内にマッチできなかったら緩和）
    ELSIF v_waiting_hours < 168 THEN
      v_rating_tolerance := 300;  -- 72-168時間: ±300（3日-7日経過でさらに緩和）
    ELSE
      v_rating_tolerance := 999999; -- 168時間（7日）以降: 無制限（どうしても当たらない場合は全体からマッチ）
    END IF;
    
    -- 対戦相手を検索（同じ初期待機期間を満たしている相手のみ）
    SELECT 
      s2.id,
      s2.user_id,
      s2.created_at,
      s2.video_url,
      p2.rating,
      p2.username
    INTO v_opponent_rec
    FROM public.submissions s2
    JOIN public.profiles p2 ON s2.user_id = p2.id
    WHERE s2.status = 'WAITING_OPPONENT'
      AND s2.id != v_submission_rec.id
      AND s2.user_id != v_submission_rec.user_id
      AND s2.battle_format = v_submission_rec.battle_format
      AND s2.created_at + INTERVAL '10 minutes' <= NOW()  -- 相手も10分間待機済み
      AND ABS(p2.rating - v_submitter_rating) <= v_rating_tolerance
    ORDER BY ABS(p2.rating - v_submitter_rating) ASC, s2.created_at ASC
    LIMIT 1;
    
    -- マッチした場合はバトルを作成
    IF FOUND THEN
      -- バトル作成
      v_battle_id := gen_random_uuid();
      v_voting_end_time := NOW() + INTERVAL '5 days';
      v_opponent_username := v_opponent_rec.username;
      
      -- active_battles テーブルに挿入
      INSERT INTO public.active_battles (
        id,
        player1_submission_id,
        player2_submission_id,
        player1_user_id,
        player2_user_id,
        battle_format,
        status,
        votes_a,
        votes_b,
        end_voting_at,
        created_at,
        updated_at
      ) VALUES (
        v_battle_id,
        v_submission_rec.id,
        v_opponent_rec.id,
        v_submission_rec.user_id,
        v_opponent_rec.user_id,
        v_submission_rec.battle_format,
        'ACTIVE',
        0,
        0,
        v_voting_end_time,
        NOW(),
        NOW()
      );
      
      -- 両方の投稿ステータスを更新
      UPDATE public.submissions 
      SET 
        status = 'MATCHED_IN_BATTLE',
        active_battle_id = v_battle_id,
        updated_at = NOW()
      WHERE id IN (v_submission_rec.id, v_opponent_rec.id);

      -- ✅ 新機能: 段階的マッチング成功時の通知送信
      -- 投稿者への通知
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
        v_submission_rec.user_id,
        'バトルマッチングが完了しました！',
        FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は5日間です。', v_opponent_username),
        'battle_matched',
        v_battle_id,
        false,
        NOW(),
        NOW()
      );

      -- 相手への通知
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
        v_opponent_rec.user_id,
        'バトルマッチングが完了しました！',
        FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は5日間です。', v_submitter_username),
        'battle_matched',
        v_battle_id,
        false,
        NOW(),
        NOW()
      );
      
      v_matched_count := v_matched_count + 1;
      
      -- マッチング結果を記録
      v_match_result := json_build_object(
        'submission_id', v_submission_rec.id,
        'opponent_id', v_opponent_rec.id,
        'battle_id', v_battle_id,
        'submitter_rating', v_submitter_rating,
        'opponent_rating', v_opponent_rec.rating,
        'rating_difference', ABS(v_submitter_rating - v_opponent_rec.rating),
        'waiting_hours', ROUND(v_waiting_hours, 2),
        'rating_tolerance_used', v_rating_tolerance,
        'matched', true,
        'match_type', 'progressive_ideal_time_based',
        'voting_period_days', 5,
        'notifications_sent', 2
      );
      
      v_results := v_results || v_match_result;
      
      RAISE NOTICE 'Ideal progressive match created: % vs % (rating diff: %, waited: % hours, tolerance: ±%) - Notifications sent', 
        v_submission_rec.id, v_opponent_rec.id, 
        ABS(v_submitter_rating - v_opponent_rec.rating), ROUND(v_waiting_hours, 2), v_rating_tolerance;
        
    ELSE
      -- マッチしなかった場合の記録
      v_match_result := json_build_object(
        'submission_id', v_submission_rec.id,
        'submitter_rating', v_submitter_rating,
        'waiting_hours', ROUND(v_waiting_hours, 2),
        'rating_tolerance_used', v_rating_tolerance,
        'matched', false,
        'reason', 'No suitable opponent found'
      );
      
      v_results := v_results || v_match_result;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'processed_submissions', v_processed_count,
    'matches_created', v_matched_count,
    'results', v_results,
    'timestamp', NOW(),
    'function_version', 'v6_with_battle_matched_notifications',
    'execution_interval', '30_minutes',
    'initial_wait_period', '10_minutes',
    'rating_tolerance_schedule', json_build_object(
      '0_to_6_hours', 50,
      '6_to_24_hours', 100,
      '24_to_72_hours', 200,
      '72_to_168_hours', 300,
      '168_hours_plus', 'unlimited'
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in progressive_matchmaking: %', SQLERRM;
  RETURN json_build_object(
    'error', SQLERRM,
    'processed_submissions', v_processed_count,
    'matches_created', v_matched_count,
    'timestamp', NOW(),
    'function_version', 'v6_with_battle_matched_notifications'
  );
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION find_match_and_create_battle(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION progressive_matchmaking() TO authenticated;

-- コメント
COMMENT ON FUNCTION find_match_and_create_battle(UUID) IS 'マッチング時に両プレイヤーにbattle_matched通知を送信する即座マッチング関数';
COMMENT ON FUNCTION progressive_matchmaking() IS 'マッチング時に両プレイヤーにbattle_matched通知を送信する段階的マッチング関数'; 