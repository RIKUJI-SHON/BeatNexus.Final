-- Title: Fix battle_format handling and remove implicit MAIN_BATTLE default
-- Created: 2025-09-03
-- Summary:
-- - Harden create_submission_with_cooldown_check(): normalize and validate p_battle_format, no silent fallback to MAIN
-- - Update submit_video(): accept text p_battle_format (no default), validate strictly, no fallback to MAIN

-- 1) Replace create_submission_with_cooldown_check to strictly validate battle_format
CREATE OR REPLACE FUNCTION public.create_submission_with_cooldown_check(
  p_user_id uuid,
  p_video_url text,
  p_battle_format text,
  p_stream_video_id text DEFAULT NULL
)
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_submission_time timestamp;
  can_submit_now boolean;
  cooldown_remaining interval;
  new_submission_id uuid;
  remaining_minutes integer;
  v_final_video_url text;
  v_initial_stream_status text;
  v_battle_format_text text;
BEGIN
  -- シーズン制限をチェック
  SELECT can_submit_video() INTO can_submit_now;
  IF NOT can_submit_now THEN
    RETURN json_build_object(
      'success', false,
      'error', 'season_restriction',
      'message_key', 'submission.error.seasonRestriction',
      'message_params', json_build_object()
    );
  END IF;

  -- 1時間制限をチェック
  SELECT created_at INTO last_submission_time
  FROM public.submissions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour'
    AND status != 'WITHDRAWN'::public.submission_status
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_submission_time IS NOT NULL THEN
    cooldown_remaining := (last_submission_time + INTERVAL '1 hour') - NOW();
    IF cooldown_remaining > INTERVAL '0' THEN
      remaining_minutes := CEIL(EXTRACT(EPOCH FROM cooldown_remaining) / 60);
      RETURN json_build_object(
        'success', false,
        'error', 'cooldown_active',
        'message_key', 'submission.error.cooldownActive',
        'message_params', json_build_object(
          'hours', FLOOR(EXTRACT(EPOCH FROM cooldown_remaining) / 3600),
          'minutes', FLOOR((EXTRACT(EPOCH FROM cooldown_remaining) % 3600) / 60),
          'totalMinutes', remaining_minutes
        ),
        'remaining_seconds', EXTRACT(EPOCH FROM cooldown_remaining)
      );
    END IF;
  END IF;

  -- battle_format を厳密検証・正規化（大文字化・トリム）
  v_battle_format_text := UPPER(TRIM(COALESCE(p_battle_format, '')));
  IF v_battle_format_text NOT IN ('MAIN_BATTLE', 'MINI_BATTLE', 'THEME_CHALLENGE') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_battle_format',
      'message_key', 'submission.error.invalidFormat',
      'message_params', json_build_object('received', p_battle_format)
    );
  END IF;

  -- Stream利用時は video_url を Cloudflare MP4 にフォールバック（互換性維持）
  IF p_stream_video_id IS NOT NULL AND LENGTH(TRIM(p_stream_video_id)) > 0 THEN
    v_final_video_url := 'https://videodelivery.net/' || p_stream_video_id || '/mp4';
    v_initial_stream_status := 'processing';
  ELSE
    v_final_video_url := p_video_url;
    v_initial_stream_status := NULL;
  END IF;

  -- 投稿を作成
  INSERT INTO public.submissions (
    user_id,
    video_url,
    battle_format,
    created_at,
    status,
    stream_video_id,
    stream_status
  ) VALUES (
    p_user_id,
    v_final_video_url,
    v_battle_format_text::public.battle_format,
    NOW(),
    'WAITING_OPPONENT'::public.submission_status,
    p_stream_video_id,
    v_initial_stream_status
  ) RETURNING id INTO new_submission_id;

  RETURN json_build_object(
    'success', true,
    'submission_id', new_submission_id,
    'message_key', 'submission.success.created',
    'message_params', json_build_object()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'submission_error',
    'message_key', 'submission.error.creationFailed',
    'message_params', json_build_object('error', SQLERRM)
  );
END;
$$;

COMMENT ON FUNCTION public.create_submission_with_cooldown_check(uuid, text, text, text) IS 'Strict battle_format validation (no implicit MAIN fallback) + Cloudflare Stream support.';


-- 2) Replace submit_video to remove default MAIN_BATTLE and validate strictly
CREATE OR REPLACE FUNCTION public.submit_video(
  p_video_url text,
  p_battle_format text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_user_rating INTEGER;
  v_submission_id UUID;
  v_existing_submission RECORD;
  v_active_season RECORD;
  v_match_result JSON;
  v_battle_format_text text;
BEGIN
  -- ユーザー認証チェック
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'ログインが必要です'
    );
  END IF;

  -- 既存の待機中投稿をチェック
  SELECT * INTO v_existing_submission
  FROM public.submissions
  WHERE user_id = v_user_id 
    AND status = 'WAITING_OPPONENT'::public.submission_status;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_submitted',
      'message', '既に投稿済みです。マッチングをお待ちください。',
      'existing_submission_id', v_existing_submission.id
    );
  END IF;

  -- シーズン状態チェック
  SELECT * INTO v_active_season
  FROM public.seasons
  WHERE status = 'active'
    AND start_at <= NOW()
    AND end_at >= NOW()
  ORDER BY start_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'シーズンがオフ期間中のため、新しい動画を投稿することはできません。'
    );
  END IF;

  -- battle_format を厳密検証・正規化
  v_battle_format_text := UPPER(TRIM(COALESCE(p_battle_format, '')));
  IF v_battle_format_text NOT IN ('MAIN_BATTLE', 'MINI_BATTLE', 'THEME_CHALLENGE') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_battle_format',
      'message', '無効なバトル形式です',
      'received', p_battle_format
    );
  END IF;

  -- ユーザーの現在のレーティングを取得
  SELECT rating INTO v_user_rating
  FROM public.profiles
  WHERE id = v_user_id;

  -- 投稿を作成
  INSERT INTO public.submissions (
    user_id,
    video_url,
    battle_format,
    rank_at_submission,
    status
  ) VALUES (
    v_user_id,
    p_video_url,
    v_battle_format_text::public.battle_format,
    v_user_rating,
    'WAITING_OPPONENT'::public.submission_status
  ) RETURNING id INTO v_submission_id;

  -- 即座にマッチングを試行（存在する場合のみ）
  BEGIN
    SELECT find_match_and_create_battle(v_submission_id) INTO v_match_result;
  EXCEPTION WHEN undefined_function THEN
    -- find_match_and_create_battle が存在しない環境でも安全に返す
    v_match_result := json_build_object('note', 'find_match_and_create_battle not available');
  END;

  RETURN json_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'message', '動画が正常に投稿されました',
    'immediate_match_result', v_match_result
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'データベースエラーが発生しました',
      'error_details', SQLERRM
    );
END;
$function$;

COMMENT ON FUNCTION public.submit_video(text, text) IS 'Battle submission without implicit MAIN default; strictly validates battle_format.';
