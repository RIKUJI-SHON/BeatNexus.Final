-- 重複バトル防止システム実装
-- progressive_matchmaking関数に48時間以内の同じ相手との対戦履歴チェック機能を追加

-- 改良版 progressive_matchmaking 関数（重複バトル防止機能付き）
CREATE OR REPLACE FUNCTION progressive_matchmaking()
RETURNS json
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
        'match_type', 'progressive_with_duplicate_prevention',
        'voting_period_days', 5,
        'duplicate_prevention_active', true,
        'notifications_sent', 2
      );
      
      v_results := v_results || v_match_result;
      
      RAISE NOTICE 'Progressive match with duplicate prevention: % vs % (rating diff: %, waited: % hours, tolerance: ±%) - Notifications sent', 
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
    'function_version', 'v7_with_duplicate_prevention_and_notifications',
    'execution_interval', '30_minutes',
    'initial_wait_period', '10_minutes',
    'duplicate_prevention_window', '48_hours',
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
    'function_version', 'v7_with_duplicate_prevention_and_notifications'
  );
END;
$$;

-- 重複バトル防止システム用のインデックス作成（パフォーマンス最適化）
-- active_battles テーブルのクエリ最適化用
CREATE INDEX IF NOT EXISTS idx_active_battles_user_created 
ON public.active_battles (player1_user_id, player2_user_id, created_at);

-- archived_battles テーブルのクエリ最適化用（テーブルが存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archived_battles') THEN
    CREATE INDEX IF NOT EXISTS idx_archived_battles_user_created 
    ON public.archived_battles (player1_user_id, player2_user_id, created_at);
  END IF;
END $$;

-- 関数の説明を更新
COMMENT ON FUNCTION progressive_matchmaking() IS '
理想的な時間ベース段階的マッチングシステム + 重複バトル防止機能:

■ 許容レート差システム:
- 0-6時間: ±50レート差（新鮮な対戦はほぼ同格同士）
- 6-24時間: ±100レート差（少し幅を持たせてマッチ確率UP）
- 24-72時間: ±200レート差（24時間以内にマッチできなかったら緩和）
- 72-168時間: ±300レート差（3日-7日経過でさらに緩和）
- 168時間以降: 無制限（どうしても当たらない場合は全体からマッチ）

■ 重複バトル防止機能:
- 48時間以内に同じ相手と対戦したユーザー同士は再マッチしない
- active_battlesとarchived_battlesの両方から対戦履歴をチェック
- 連続対戦による不公平を防止し、多様な対戦相手との遭遇機会を増加
';

-- 実行ログ
SELECT 'ℹ️ 重複バトル防止システムが実装されました' as message;
SELECT '🛡️ 48時間以内の同じ相手との再対戦を防止' as feature;
SELECT '📊 時間ベース許容レート差: 6h(±50) → 24h(±100) → 72h(±200) → 168h(±300) → 無制限' as rating_system;
SELECT '⏰ 実行間隔: 30分ごと、初期待機: 10分間' as timing;
SELECT '🔍 パフォーマンス最適化用インデックスを作成' as optimization;
