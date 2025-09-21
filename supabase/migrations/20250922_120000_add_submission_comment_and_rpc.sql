-- Title: Add one-line comment to submissions and RPC to create with comment
-- Created: 2025-09-22
-- Notes:
-- - Adds nullable one_line_comment with length constraint (<= 140 chars)
-- - Introduces RPC create_submission_with_comment to avoid changing existing function signature
-- - RPC delegates to existing create_submission_with_cooldown_check and then updates comment

-- 1) Add column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'one_line_comment'
  ) THEN
    ALTER TABLE public.submissions
      ADD COLUMN one_line_comment TEXT;
  END IF;

  -- Add or ensure length constraint (<= 140)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'submissions_one_line_comment_length_check'
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT submissions_one_line_comment_length_check
      CHECK (one_line_comment IS NULL OR char_length(one_line_comment) <= 140);
  END IF;
END $$;

-- 2) New RPC: create_submission_with_comment
CREATE OR REPLACE FUNCTION public.create_submission_with_comment(
  p_user_id uuid,
  p_video_url text,
  p_battle_format public.battle_format,
  p_stream_video_id text DEFAULT NULL,
  p_comment text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_success boolean;
  v_submission_id uuid;
  v_trimmed_comment text;
BEGIN
  -- Normalize and validate comment
  v_trimmed_comment := NULLIF(BTRIM(p_comment), '');
  IF v_trimmed_comment IS NOT NULL AND char_length(v_trimmed_comment) > 140 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'comment_too_long',
      'message_key', 'submission.error.commentTooLong',
      'message_params', json_build_object('max', 140)
    );
  END IF;

  -- Delegate to existing creation function (keeps all existing checks/logic)
  v_result := public.create_submission_with_cooldown_check(p_user_id, p_video_url, p_battle_format, p_stream_video_id);

  v_success := COALESCE((v_result->>'success')::boolean, false);
  IF NOT v_success THEN
    RETURN v_result; -- propagate original error
  END IF;

  v_submission_id := NULLIF(v_result->>'submission_id', '')::uuid;
  IF v_submission_id IS NULL THEN
    -- Should not happen, but handle defensively
    RETURN json_build_object(
      'success', false,
      'error', 'submission_id_missing',
      'message_key', 'submission.error.creationFailed'
    );
  END IF;

  -- Set comment if provided
  IF v_trimmed_comment IS NOT NULL THEN
    UPDATE public.submissions
      SET one_line_comment = v_trimmed_comment,
          updated_at = NOW()
      WHERE id = v_submission_id;
  END IF;

  -- Return original result for compatibility
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_submission_with_comment(uuid, text, public.battle_format, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_submission_with_comment(uuid, text, public.battle_format, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_submission_with_comment(uuid, text, public.battle_format, text, text)
IS 'Creates a submission via existing cooldown function and optionally attaches a one-line comment (<=140 chars).';
