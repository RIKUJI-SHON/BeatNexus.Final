-- 🎯 理想的な段階的マッチングシステムの実装
-- ユーザー提案の時間ベース許容レート差システム

-- 改良版 progressive_matchmaking 関数
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
  v_results JSON[] := '{}';
  v_match_result JSON;
  v_rating_tolerance INTEGER;
  v_waiting_hours NUMERIC;
  v_submitter_rating INTEGER;
  v_opponent_rating INTEGER;
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
      p2.rating
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
        'voting_period_days', 5
      );
      
      v_results := v_results || v_match_result;
      
      RAISE NOTICE 'Ideal progressive match created: % vs % (rating diff: %, waited: % hours, tolerance: ±%)', 
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
    'function_version', 'v5_ideal_time_based_matching',
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
    'function_version', 'v5_ideal_time_based_matching'
  );
END;
$$;

-- 関数の説明を追加
COMMENT ON FUNCTION progressive_matchmaking() IS '
理想的な時間ベース段階的マッチングシステム:
- 0-6時間: ±50レート差（新鮮な対戦はほぼ同格同士）
- 6-24時間: ±100レート差（少し幅を持たせてマッチ確率UP）
- 24-72時間: ±200レート差（24時間以内にマッチできなかったら緩和）
- 72-168時間: ±300レート差（3日-7日経過でさらに緩和）
- 168時間以降: 無制限（どうしても当たらない場合は全体からマッチ）
';

-- 実行ログ
RAISE NOTICE '✅ 理想的な段階的マッチングシステムが実装されました';
RAISE NOTICE '📊 時間ベース許容レート差: 6h(±50) → 24h(±100) → 72h(±200) → 168h(±300) → 無制限';
RAISE NOTICE '⏰ 実行間隔: 30分ごと、初期待機: 10分間'; 