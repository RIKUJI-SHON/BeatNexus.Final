-- IMPORTANT: Preserve existing default param, search_path, and notification logic. Only add score_sheet copy.
BEGIN;

-- Ensure we drop the existing function to avoid default-parameter conflicts
DROP FUNCTION IF EXISTS public.complete_battle_with_video_archiving(uuid, uuid);

-- Recreate with updated body (score_sheet copy included) and keep default for p_winner_id
CREATE FUNCTION public.complete_battle_with_video_archiving(
  p_battle_id uuid,
  p_winner_id uuid DEFAULT NULL::uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_battle_rec active_battles;
  v_archived_battle_id UUID;
  v_player1_video_url TEXT;
  v_player2_video_url TEXT;
  v_player1_deleted BOOLEAN := FALSE;
  v_player2_deleted BOOLEAN := FALSE;
  v_rating_result JSON;
  v_season_result JSON;
  v_player1_username TEXT;
  v_player2_username TEXT;
  v_player1_language TEXT;
  v_player2_language TEXT;
  v_current_season_id UUID;
  v_json_msg JSON;
  v_player1_outcome TEXT;
  v_player2_outcome TEXT;
BEGIN
  SELECT * INTO v_battle_rec FROM public.active_battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Battle not found');
  END IF;

  SELECT id INTO v_current_season_id FROM public.seasons WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;

  SELECT COALESCE(is_deleted, FALSE), username, language
    INTO v_player1_deleted, v_player1_username, v_player1_language
  FROM public.profiles WHERE id = v_battle_rec.player1_user_id;

  SELECT COALESCE(is_deleted, FALSE), username, language
    INTO v_player2_deleted, v_player2_username, v_player2_language
  FROM public.profiles WHERE id = v_battle_rec.player2_user_id;

  SELECT video_url INTO v_player1_video_url FROM public.submissions WHERE id = v_battle_rec.player1_submission_id;
  SELECT video_url INTO v_player2_video_url FROM public.submissions WHERE id = v_battle_rec.player2_submission_id;

  INSERT INTO public.archived_battles (
    original_battle_id, winner_id, final_votes_a, final_votes_b, battle_format,
    player1_user_id, player2_user_id, player1_submission_id, player2_submission_id,
    player1_video_url, player2_video_url, season_id, archived_at, created_at, updated_at
  ) VALUES (
    p_battle_id, p_winner_id, v_battle_rec.votes_a, v_battle_rec.votes_b, v_battle_rec.battle_format,
    v_battle_rec.player1_user_id, v_battle_rec.player2_user_id, v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id,
    v_player1_video_url, v_player2_video_url, v_current_season_id, NOW(), NOW(), NOW()
  ) RETURNING id INTO v_archived_battle_id;

  -- Copy votes with comments; include score_sheet column (added)
  INSERT INTO public.archived_battle_votes (archived_battle_id, user_id, vote, comment, created_at, score_sheet)
  SELECT v_archived_battle_id, bv.user_id, bv.vote, bv.comment, bv.created_at, bv.score_sheet
  FROM public.battle_votes bv
  WHERE bv.battle_id = p_battle_id AND bv.comment IS NOT NULL AND bv.comment != '';

  UPDATE public.submissions
     SET status = 'BATTLE_ENDED', updated_at = NOW()
   WHERE id IN (v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id);

  SELECT update_battle_ratings_safe(p_battle_id, p_winner_id, v_player1_deleted, v_player2_deleted) INTO v_rating_result;

  BEGIN
    SELECT update_season_points_after_battle(p_battle_id, p_winner_id) INTO v_season_result;
  EXCEPTION WHEN undefined_function THEN
    v_season_result := json_build_object('skipped', true, 'reason', 'function not found');
  END;

  IF p_winner_id IS NULL THEN
    v_player1_outcome := 'draw';
    v_player2_outcome := 'draw';
  ELSIF p_winner_id = v_battle_rec.player1_user_id THEN
    v_player1_outcome := 'win';
    v_player2_outcome := 'lose';
  ELSIF p_winner_id = v_battle_rec.player2_user_id THEN
    v_player1_outcome := 'lose';
    v_player2_outcome := 'win';
  ELSE
    v_player1_outcome := 'draw';
    v_player2_outcome := 'draw';
  END IF;

  -- Notifications (preserved from prod)
  IF NOT v_player1_deleted THEN
    v_json_msg := public.get_battle_result_notification_text(v_player1_outcome, v_player2_username, v_player1_language);
    INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
    VALUES (
      v_battle_rec.player1_user_id,
      v_json_msg->>'title',
      v_json_msg->>'message',
      CASE v_player1_outcome WHEN 'win' THEN 'battle_win' WHEN 'lose' THEN 'battle_lose' ELSE 'battle_draw' END,
      p_battle_id,
      false,
      NOW(), NOW()
    );
  END IF;

  IF NOT v_player2_deleted THEN
    v_json_msg := public.get_battle_result_notification_text(v_player2_outcome, v_player1_username, v_player2_language);
    INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
    VALUES (
      v_battle_rec.player2_user_id,
      v_json_msg->>'title',
      v_json_msg->>'message',
      CASE v_player2_outcome WHEN 'win' THEN 'battle_win' WHEN 'lose' THEN 'battle_lose' ELSE 'battle_draw' END,
      p_battle_id,
      false,
      NOW(), NOW()
    );
  END IF;

  DELETE FROM public.active_battles WHERE id = p_battle_id;

  RETURN json_build_object(
    'success', true,
    'archived_battle_id', v_archived_battle_id,
    'winner_id', p_winner_id,
    'season_id', v_current_season_id,
    'final_votes_a', v_battle_rec.votes_a,
    'final_votes_b', v_battle_rec.votes_b,
    'player1_video_url', v_player1_video_url,
    'player2_video_url', v_player2_video_url,
    'player1_deleted', v_player1_deleted,
    'player2_deleted', v_player2_deleted,
    'rating_update', v_rating_result,
    'season_points_update', v_season_result,
    'notifications_sent', CASE 
      WHEN v_player1_deleted AND v_player2_deleted THEN 0
      WHEN v_player1_deleted OR v_player2_deleted THEN 1
      ELSE 2
    END,
    'multilang', true,
    'score_sheet_copy', true
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Transaction failed', 'error_details', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.complete_battle_with_video_archiving IS 'バトル完了時のアーカイブ処理（score_sheetコピー対応, preserves notifications）';

COMMIT;
