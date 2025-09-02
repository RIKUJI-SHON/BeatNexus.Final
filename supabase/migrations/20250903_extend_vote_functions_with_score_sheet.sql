-- Extend vote functions to accept optional score_sheet jsonb without changing existing logic
-- Precondition: existing functions public.vote_battle(uuid, character) and public.vote_battle_with_comment(uuid, character, text)
-- Strategy: Add safe overloads that call existing functions, then (optionally) validate and persist score_sheet to battle_votes.

BEGIN;

-- Helper validation function (stable, internal)
CREATE OR REPLACE FUNCTION public._validate_score_sheet(p_score_sheet jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_skills_A INT; v_skills_B INT;
  v_musicality_A INT; v_musicality_B INT;
  v_originality_A INT; v_originality_B INT;
BEGIN
  IF p_score_sheet IS NULL THEN
    RETURN TRUE;
  END IF;
  BEGIN
    v_skills_A := (p_score_sheet->'skills'->>'A')::int;
    v_skills_B := (p_score_sheet->'skills'->>'B')::int;
    v_musicality_A := (p_score_sheet->'musicality'->>'A')::int;
    v_musicality_B := (p_score_sheet->'musicality'->>'B')::int;
    v_originality_A := (p_score_sheet->'originality'->>'A')::int;
    v_originality_B := (p_score_sheet->'originality'->>'B')::int;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  IF (v_skills_A < 0 OR v_skills_A > 100) OR (v_skills_B < 0 OR v_skills_B > 100)
     OR (v_musicality_A < 0 OR v_musicality_A > 100) OR (v_musicality_B < 0 OR v_musicality_B > 100)
     OR (v_originality_A < 0 OR v_originality_A > 100) OR (v_originality_B < 0 OR v_originality_B > 100) THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;$$;

-- Overload: vote_battle with optional score_sheet
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

  -- Run existing logic
  v_result := public.vote_battle(p_battle_id, p_vote);

  -- If score sheet provided, validate and persist
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

-- Overload: vote_battle_with_comment with optional score_sheet
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

  -- Run existing logic
  v_result := public.vote_battle_with_comment(p_battle_id, p_vote, p_comment);

  -- If score sheet provided, validate and persist
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
