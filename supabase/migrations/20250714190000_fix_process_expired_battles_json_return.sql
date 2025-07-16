-- 🔧 process_expired_battles関数のJSONパースエラー修正
-- 戻り値型をVOIDからJSONに変更し、処理結果を返却可能にする
-- 元の機能（期限切れバトル自動処理）は完全に保持

-- 既存のVOID型関数を削除
DROP FUNCTION IF EXISTS public.process_expired_battles();

-- 新しいJSON戻り値型の関数を作成
CREATE OR REPLACE FUNCTION public.process_expired_battles()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  rec RECORD;
  v_winner_id UUID;
  v_is_tie BOOLEAN;
  v_result JSON;
  v_processed_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_processed_battles JSON[] := ARRAY[]::JSON[];
  v_errors JSON[] := ARRAY[]::JSON[];
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

      -- 処理成功をカウント・記録
      v_processed_count := v_processed_count + 1;
      v_processed_battles := v_processed_battles || json_build_object(
        'battle_id', rec.id,
        'winner_id', v_winner_id,
        'is_tie', v_is_tie,
        'votes_a', rec.votes_a,
        'votes_b', rec.votes_b,
        'completion_result', v_result
      );

      -- Log successful completion (引数数を修正)
      RAISE NOTICE 'Battle % completed successfully', rec.id;

    EXCEPTION WHEN OTHERS THEN
      -- If any error occurs, log it and revert the status to 'ACTIVE' for a retry
      v_error_count := v_error_count + 1;
      v_errors := v_errors || json_build_object(
        'battle_id', rec.id,
        'error_message', SQLERRM,
        'error_time', now()
      );
      
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
      UPDATE public.active_battles
      SET status = 'ACTIVE'
      WHERE id = rec.id AND status = 'PROCESSING_RESULTS';
    END;
  END LOOP;

  -- 処理結果をJSON形式で返却
  RETURN json_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'error_count', v_error_count,
    'processed_battles', v_processed_battles,
    'errors', v_errors,
    'execution_time', now()
  );
END;
$function$;

-- pg_cronからの実行権限を付与
GRANT EXECUTE ON FUNCTION public.process_expired_battles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_expired_battles() TO postgres; 