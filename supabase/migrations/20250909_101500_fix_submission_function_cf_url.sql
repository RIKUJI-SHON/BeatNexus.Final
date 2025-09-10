-- Title: Fix submission function to set video_url when using Cloudflare Stream
-- Created: 2025-09-09
-- Rationale:
-- - Production has submissions.video_url with NOT NULL constraint.
-- - Current function inserts p_video_url directly, which can be NULL when Stream is used.
-- - To avoid NOT NULL violation and keep backward compatibility, set video_url to Cloudflare MP4 URL when p_stream_video_id is provided.
-- - Stream status starts as 'processing' for new uploads.

CREATE OR REPLACE FUNCTION public.create_submission_with_cooldown_check(
  p_user_id uuid,
  p_video_url text,
  p_battle_format battle_format,
  p_stream_video_id text DEFAULT NULL
)
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cooldown_info JSON;
  v_submission_id UUID;
  v_new_submission submissions%ROWTYPE;
  v_rank_at_submission INTEGER;
  v_final_video_url text;
  v_initial_stream_status text;
BEGIN
  -- Cooldown check
  SELECT check_submission_cooldown(p_user_id) INTO v_cooldown_info;
  IF (v_cooldown_info->>'can_submit')::boolean = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'cooldown_active',
      'message', v_cooldown_info->>'message',
      'message_key', v_cooldown_info->>'message_key',
      'message_params', v_cooldown_info->>'message_params'
    );
  END IF;

  -- Current rating at submission
  SELECT rating INTO v_rank_at_submission
  FROM profiles
  WHERE id = p_user_id;

  -- Determine final video_url and initial stream status
  IF p_stream_video_id IS NOT NULL AND LENGTH(TRIM(p_stream_video_id)) > 0 THEN
    v_final_video_url := 'https://videodelivery.net/' || p_stream_video_id || '/mp4';
    v_initial_stream_status := 'processing';
  ELSE
    v_final_video_url := p_video_url;
    v_initial_stream_status := NULL;
  END IF;

  -- Create submission
  INSERT INTO submissions (
    user_id,
    video_url,
    battle_format,
    rank_at_submission,
    stream_video_id,
    stream_status
  ) VALUES (
    p_user_id,
    v_final_video_url,
    p_battle_format,
    v_rank_at_submission,
    p_stream_video_id,
    v_initial_stream_status
  )
  RETURNING * INTO v_new_submission;

  v_submission_id := v_new_submission.id;

  RETURN json_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'message', 'Submission created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'submission_failed',
    'message', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.create_submission_with_cooldown_check(uuid, text, battle_format, text)
IS 'Sets video_url to Cloudflare MP4 when streamVideoId is provided to satisfy NOT NULL and keep compatibility; initializes stream_status=processing.';
