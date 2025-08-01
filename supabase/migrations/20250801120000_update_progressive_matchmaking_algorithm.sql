-- 段階的マッチングアルゴリズムの更新
-- より積極的なマッチングによる待ち時間短縮を目的とした変更

-- 改良版 progressive_matchmaking 関数（新しい時間ベースレート差アルゴリズム）
CREATE OR REPLACE FUNCTION public.progressive_matchmaking()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_submission_rec RECORD;
  v_opponent_rec RECORD;
  v_battle_id UUID;
  v_voting_end_time TIMESTAMPTZ;
  v_processed_count INTEGER := 0;
  v_matched_count INTEGER := 0;
  v_duplicate_prevention_count INTEGER := 0;
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
    
    -- 🎯 新しい積極的な時間ベース許容レート差システム
    IF v_waiting_hours < 3 THEN
      v_rating_tolerance := 100;  -- 0-3時間: ±100（最初の数時間は、質の高いマッチングを維持する）
    ELSIF v_waiting_hours < 12 THEN
      v_rating_tolerance := 200;  -- 3-12時間: ±200（半日以内に、マッチングの可能性を大きく広げる）
    ELSIF v_waiting_hours < 24 THEN
      v_rating_tolerance := 400;  -- 12-24時間: ±400（1日待てば、かなり広い範囲の相手とマッチングできる）
    ELSE
      v_rating_tolerance := 999999; -- 24時間以降: 無制限（24時間経過した投稿は、必ず誰かとマッチング）
    END IF;
    
    -- 🛡️ 重複バトル防止機能付き対戦相手検索
    -- 48時間以内に対戦したことがない相手のみを検索対象とする
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
      -- 🛡️ 重複バトル防止条件: 48時間以内に同じ相手との対戦履歴がないことを確認
      AND NOT EXISTS (
        -- active_battlesテーブルから48時間以内の対戦履歴をチェック
        SELECT 1 FROM public.active_battles ab
        JOIN public.submissions s1 ON (ab.player1_submission_id = s1.id OR ab.player2_submission_id = s1.id)
        JOIN public.submissions s3 ON (ab.player1_submission_id = s3.id OR ab.player2_submission_id = s3.id)
        WHERE ab.created_at >= NOW() - INTERVAL '48 hours'
          AND s1.user_id = v_submission_rec.user_id
          AND s3.user_id = s2.user_id
          AND s1.id != s3.id
      )
      AND NOT EXISTS (
        -- archived_battlesテーブルからも48時間以内の対戦履歴をチェック
        SELECT 1 FROM public.archived_battles ab
        JOIN public.submissions s1 ON (ab.player1_submission_id = s1.id OR ab.player2_submission_id = s1.id)
        JOIN public.submissions s3 ON (ab.player1_submission_id = s3.id OR ab.player2_submission_id = s3.id)
        WHERE ab.created_at >= NOW() - INTERVAL '48 hours'
          AND s1.user_id = v_submission_rec.user_id
          AND s3.user_id = s2.user_id
          AND s1.id != s3.id
      )
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

      -- ✅ 段階的マッチング成功時の通知送信
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
        'match_type', 'progressive_aggressive_with_duplicate_prevention',
        'voting_period_days', 5,
        'duplicate_prevention_active', true,
        'notifications_sent', 2
      );
      
      v_results := v_results || v_match_result;
      
      RAISE NOTICE 'Progressive aggressive match with duplicate prevention: % vs % (rating diff: %, waited: % hours, tolerance: ±%) - Notifications sent', 
        v_submission_rec.id, v_opponent_rec.id, 
        ABS(v_submitter_rating - v_opponent_rec.rating), ROUND(v_waiting_hours, 2), v_rating_tolerance;
        
    ELSE
      -- マッチしなかった場合の記録
      -- 重複防止により除外された候補数をカウント
      SELECT COUNT(*) INTO v_duplicate_prevention_count
      FROM public.submissions s2
      JOIN public.profiles p2 ON s2.user_id = p2.id
      WHERE s2.status = 'WAITING_OPPONENT'
        AND s2.id != v_submission_rec.id
        AND s2.user_id != v_submission_rec.user_id
        AND s2.battle_format = v_submission_rec.battle_format
        AND s2.created_at + INTERVAL '10 minutes' <= NOW()
        AND ABS(p2.rating - v_submitter_rating) <= v_rating_tolerance
        AND (
          EXISTS (
            SELECT 1 FROM public.active_battles ab
            JOIN public.submissions s1 ON (ab.player1_submission_id = s1.id OR ab.player2_submission_id = s1.id)
            JOIN public.submissions s3 ON (ab.player1_submission_id = s3.id OR ab.player2_submission_id = s3.id)
            WHERE ab.created_at >= NOW() - INTERVAL '48 hours'
              AND s1.user_id = v_submission_rec.user_id
              AND s3.user_id = s2.user_id
              AND s1.id != s3.id
          ) OR EXISTS (
            SELECT 1 FROM public.archived_battles ab
            JOIN public.submissions s1 ON (ab.player1_submission_id = s1.id OR ab.player2_submission_id = s1.id)
            JOIN public.submissions s3 ON (ab.player1_submission_id = s3.id OR ab.player2_submission_id = s3.id)
            WHERE ab.created_at >= NOW() - INTERVAL '48 hours'
              AND s1.user_id = v_submission_rec.user_id
              AND s3.user_id = s2.user_id
              AND s1.id != s3.id
          )
        );
      
      v_match_result := json_build_object(
        'submission_id', v_submission_rec.id,
        'submitter_rating', v_submitter_rating,
        'waiting_hours', ROUND(v_waiting_hours, 2),
        'rating_tolerance_used', v_rating_tolerance,
        'matched', false,
        'reason', 'No suitable opponent found',
        'candidates_excluded_by_duplicate_prevention', v_duplicate_prevention_count,
        'duplicate_prevention_active', true
      );
      
      v_results := v_results || v_match_result;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'processed_submissions', v_processed_count,
    'matches_created', v_matched_count,
    'results', v_results,
    'timestamp', NOW(),
    'function_version', 'v8_aggressive_time_based_matching',
    'execution_interval', '30_minutes',
    'initial_wait_period', '10_minutes',
    'duplicate_prevention_window', '48_hours',
    'rating_tolerance_schedule', json_build_object(
      '0_to_3_hours', 100,
      '3_to_12_hours', 200,
      '12_to_24_hours', 400,
      '24_hours_plus', 'unlimited'
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in progressive_matchmaking: %', SQLERRM;
  RETURN json_build_object(
    'error', SQLERRM,
    'processed_submissions', v_processed_count,
    'matches_created', v_matched_count,
    'timestamp', NOW(),
    'function_version', 'v8_aggressive_time_based_matching'
  );
END;
$function$;

-- 関数の説明を更新
COMMENT ON FUNCTION progressive_matchmaking() IS '
積極的な時間ベース段階的マッチングシステム + 重複バトル防止機能:

■ 新しい許容レート差システム（積極的マッチング）:
- 0-3時間: ±100レート差（最初の数時間は、質の高いマッチングを維持する）
- 3-12時間: ±200レート差（半日以内に、マッチングの可能性を大きく広げる）
- 12-24時間: ±400レート差（1日待てば、かなり広い範囲の相手とマッチングできるようにする）
- 24時間以降: 無制限（24時間経過した投稿は、必ず誰かとマッチングさせ、待ち続ける状態を完全になくす）

■ 重複バトル防止機能:
- 48時間以内に同じ相手と対戦したユーザー同士は再マッチしない
- active_battlesとarchived_battlesの両方から履歴チェック

■ 通知機能:
- マッチング成立時に両プレイヤーに自動通知送信

■ 実行仕様:
- 実行間隔: 30分ごと（pg_cron）
- 初期待機期間: 10分間（即時マッチングとの競合回避）
- 投票期間: 5日間
';

-- 実行ログ
SELECT '✅ 積極的段階的マッチングアルゴリズムが更新されました' as status;
SELECT '📊 新しい時間ベース許容レート差: 3h(±100) → 12h(±200) → 24h(±400) → 無制限' as rating_system;
SELECT '⚡ より短い待ち時間でのマッチング実現を目指します' as improvement;
