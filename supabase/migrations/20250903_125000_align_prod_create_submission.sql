-- Align production with development: ensure enum-typed 4-arg version exists and drop text-typed 4-arg version

-- 1) Create or replace enum-typed 4-arg version
CREATE OR REPLACE FUNCTION public.create_submission_with_cooldown_check(
  p_user_id uuid,
  p_video_url text,
  p_battle_format public.battle_format,
  p_stream_video_id text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cooldown_info JSON;
  v_submission_id UUID;
  v_new_submission submissions%ROWTYPE;
  v_rank_at_submission INTEGER;
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

  -- Create submission (Cloudflare Stream first-class)
  INSERT INTO submissions (
    user_id,
    video_url,
    battle_format,
    rank_at_submission,
    stream_video_id,
    stream_status
  ) VALUES (
    p_user_id,
    p_video_url,
    p_battle_format,
    v_rank_at_submission,
    p_stream_video_id,
    CASE WHEN p_stream_video_id IS NOT NULL THEN 'ready' ELSE 'pending' END
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

-- 2) Drop ambiguous 4-arg text overload if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_submission_with_cooldown_check'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid, text, text, text'
  ) THEN
    EXECUTE 'DROP FUNCTION public.create_submission_with_cooldown_check(uuid, text, text, text)';
  END IF;
END $$;
