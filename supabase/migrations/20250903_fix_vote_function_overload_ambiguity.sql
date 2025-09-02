-- Fix ambiguous function resolution for vote_battle/vote_battle_with_comment
-- Strategy:
-- 1) Drop prior 3/4-arg overloads added earlier (to avoid conflicts during rename)
-- 2) Rename existing 2/3-arg functions to *_legacy
-- 3) Recreate a single public function per name with defaulted p_score_sheet that calls *_legacy and persists score_sheet

BEGIN;

-- 1) Drop prior overloads (if exist)
DO $$
BEGIN
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.vote_battle(uuid, character, jsonb) FROM authenticated;
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
  BEGIN
    DROP FUNCTION IF EXISTS public.vote_battle(uuid, character, jsonb);
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  BEGIN
    REVOKE EXECUTE ON FUNCTION public.vote_battle_with_comment(uuid, character, text, jsonb) FROM authenticated;
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
  BEGIN
    DROP FUNCTION IF EXISTS public.vote_battle_with_comment(uuid, character, text, jsonb);
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
END$$;

-- 2) Rename legacy implementations
DO $$
BEGIN
  BEGIN
    ALTER FUNCTION public.vote_battle(uuid, character) RENAME TO vote_battle_legacy;
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  BEGIN
    ALTER FUNCTION public.vote_battle_with_comment(uuid, character, text) RENAME TO vote_battle_with_comment_legacy;
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
END$$;

-- 3) Recreate single functions with defaulted p_score_sheet that call *_legacy

-- Ensure validator exists (created by previous migration)
-- CREATE OR REPLACE FUNCTION public._validate_score_sheet(jsonb) ... -- assumed present

CREATE OR REPLACE FUNCTION public.vote_battle(
  p_battle_id uuid,
  p_vote character,
  p_score_sheet jsonb DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Call legacy implementation (unchanged core logic)
  v_result := public.vote_battle_legacy(p_battle_id, p_vote);

  -- Optionally persist score sheet
  IF p_score_sheet IS NOT NULL THEN
    IF NOT public._validate_score_sheet(p_score_sheet) THEN
      RETURN json_build_object('success', false, 'error', 'invalid_score_sheet');
    END IF;
    UPDATE public.battle_votes
      SET score_sheet = p_score_sheet
    WHERE battle_id = p_battle_id AND user_id = v_user_id;
  END IF;

  RETURN v_result;
END;$$;

GRANT EXECUTE ON FUNCTION public.vote_battle(uuid, character, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.vote_battle_with_comment(
  p_battle_id uuid,
  p_vote character,
  p_comment text,
  p_score_sheet jsonb DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Call legacy implementation (unchanged core logic)
  v_result := public.vote_battle_with_comment_legacy(p_battle_id, p_vote, p_comment);

  -- Optionally persist score sheet
  IF p_score_sheet IS NOT NULL THEN
    IF NOT public._validate_score_sheet(p_score_sheet) THEN
      RETURN json_build_object('success', false, 'error', 'invalid_score_sheet');
    END IF;
    UPDATE public.battle_votes
      SET score_sheet = p_score_sheet
    WHERE battle_id = p_battle_id AND user_id = v_user_id;
  END IF;

  RETURN v_result;
END;$$;

GRANT EXECUTE ON FUNCTION public.vote_battle_with_comment(uuid, character, text, jsonb) TO authenticated;

COMMIT;
