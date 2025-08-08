-- 20250808_fix_end_current_season_ranking_logic.sql
-- 目的: end_current_season関数の順位計算をRANK()からDENSE_RANK()に変更し、自然な順位表示にする
-- 問題: シーズン終了時のアーカイブで同率の場合に次の順位が飛ばされる問題
-- 解決: DENSE_RANK()を使用して自然な順位表示でアーカイブする

BEGIN;

CREATE OR REPLACE FUNCTION public.end_current_season()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_current_season RECORD;
  v_player_ranking_count INTEGER := 0;
  v_voter_ranking_count INTEGER := 0;
  
  -- 既存: 強制終了処理用
  v_active_battle RECORD;
  v_winner_id UUID;
  v_force_end_result JSON;
  v_forced_battles_count INTEGER := 0;
  v_forced_battles_errors INTEGER := 0;
  v_forced_battles_details JSON[] := ARRAY[]::JSON[];
  v_forced_battles_errors_details JSON[] := ARRAY[]::JSON[];
BEGIN
  -- 修正: 終了時刻を過ぎたアクティブシーズンのみ取得
  SELECT * INTO v_current_season
  FROM seasons 
  WHERE status = 'active'
    AND end_at <= NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    DECLARE
      v_active_season_count INTEGER;
      v_future_season RECORD;
    BEGIN
      SELECT COUNT(*) INTO v_active_season_count FROM seasons WHERE status = 'active';
      IF v_active_season_count = 0 THEN
        RETURN json_build_object('success', false, 'error', 'no_active_season', 'message', 'アクティブなシーズンが見つかりません');
      ELSE
        SELECT * INTO v_future_season FROM seasons WHERE status = 'active' AND end_at > NOW() ORDER BY created_at DESC LIMIT 1;
        RETURN json_build_object(
          'success', false,
          'error', 'season_not_yet_ended',
          'message', FORMAT('アクティブなシーズン「%s」はまだ終了時刻に達していません（終了予定: %s、現在時刻: %s）', v_future_season.name, v_future_season.end_at, NOW()),
          'season_info', json_build_object('id', v_future_season.id, 'name', v_future_season.name, 'end_at', v_future_season.end_at, 'current_time', NOW(), 'remaining_time', v_future_season.end_at - NOW())
        );
      END IF;
    END;
  END IF;

  -- Phase 0: アクティブバトル強制終了
  FOR v_active_battle IN
    SELECT id, player1_user_id, player2_user_id, votes_a, votes_b, battle_format, end_voting_at, created_at
    FROM public.active_battles
    WHERE status = 'ACTIVE' AND end_voting_at > NOW()
    ORDER BY created_at ASC
  LOOP
    BEGIN
      IF v_active_battle.votes_a > v_active_battle.votes_b THEN
        v_winner_id := v_active_battle.player1_user_id;
      ELSIF v_active_battle.votes_b > v_active_battle.votes_a THEN
        v_winner_id := v_active_battle.player2_user_id;
      ELSE
        v_winner_id := NULL;
      END IF;

      SELECT complete_battle_with_video_archiving(v_active_battle.id, v_winner_id) INTO v_force_end_result;

      IF (v_force_end_result->>'success')::boolean = true THEN
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
        
        INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
        VALUES (v_active_battle.player1_user_id, 'シーズン終了によるバトル強制終了', 'シーズン終了に伴い、進行中のバトルが強制的に終了されました。投票期間の途中でしたが、その時点での投票数で勝敗が決定されました。', 'info', v_active_battle.id, false, NOW(), NOW());
        INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
        VALUES (v_active_battle.player2_user_id, 'シーズン終了によるバトル強制終了', 'シーズン終了に伴い、進行中のバトルが強制的に終了されました。投票期間の途中でしたが、その時点での投票数で勝敗が決定されました。', 'info', v_active_battle.id, false, NOW(), NOW());
      ELSE
        RAISE EXCEPTION 'Battle completion failed: %', v_force_end_result->>'error';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_forced_battles_errors := v_forced_battles_errors + 1;
      v_forced_battles_errors_details := v_forced_battles_errors_details || json_build_object(
        'battle_id', v_active_battle.id,
        'error_message', SQLERRM,
        'error_time', NOW(),
        'battle_details', json_build_object('votes_a', v_active_battle.votes_a, 'votes_b', v_active_battle.votes_b, 'end_voting_at', v_active_battle.end_voting_at, 'battle_format', v_active_battle.battle_format)
      );
    END;
  END LOOP;

  -- Phase 1: バトルランキング（当該シーズン参加者のみ、DENSE_RANK使用）
  INSERT INTO public.season_rankings (season_id, user_id, points, rank)
  SELECT 
    v_current_season.id,
    p.id,
    p.season_points,
    DENSE_RANK() OVER (ORDER BY p.season_points DESC) -- RANK() から DENSE_RANK() に変更
  FROM public.profiles p
  WHERE p.is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM public.archived_battles ab
      WHERE ab.season_id = v_current_season.id
        AND (ab.player1_user_id = p.id OR ab.player2_user_id = p.id)
    )
  ORDER BY p.season_points DESC, p.username ASC;
  GET DIAGNOSTICS v_player_ranking_count = ROW_COUNT;

  -- Phase 2: 投票者ランキング（DENSE_RANK使用）
  INSERT INTO public.season_voter_rankings (season_id, user_id, votes, rank)
  SELECT v_current_season.id, id, season_vote_points,
         DENSE_RANK() OVER (ORDER BY season_vote_points DESC) -- RANK() から DENSE_RANK() に変更
  FROM public.profiles
  WHERE is_deleted = FALSE AND season_vote_points >= 1
  ORDER BY season_vote_points DESC, username ASC;
  GET DIAGNOSTICS v_voter_ranking_count = ROW_COUNT;

  -- Phase 3: シーズン終了
  UPDATE public.seasons 
  SET status = 'ended', end_at = NOW(), updated_at = NOW()
  WHERE id = v_current_season.id;

  -- Phase 4: ポイントリセット
  UPDATE public.profiles 
  SET season_points = 1200, season_vote_points = 0, updated_at = NOW()
  WHERE is_deleted = FALSE;

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
    'message', FORMAT('シーズンが正常に終了しました。アクティブバトル%s件を強制終了しました。新しいシーズンを開始するには start_new_season() 関数を実行してください。', v_forced_battles_count)
  );
END;
$$;

COMMENT ON FUNCTION public.end_current_season()
IS 'シーズン終了処理：アクティブバトル強制終了・ランキングアーカイブ（DENSE_RANK使用）・ポイントリセット';

COMMIT;
