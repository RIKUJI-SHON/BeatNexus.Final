-- Participant-only score breakdown getters
BEGIN;

-- Active battle breakdown
CREATE OR REPLACE FUNCTION public.get_battle_score_breakdown(
  p_battle_id uuid
) RETURNS TABLE (
  user_id uuid,
  vote char(1),
  comment text,
  score_sheet jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_uid uuid;
  v_p1 uuid;
  v_p2 uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT player1_user_id, player2_user_id INTO v_p1, v_p2
  FROM public.active_battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'battle_not_found';
  END IF;
  IF v_uid <> v_p1 AND v_uid <> v_p2 THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT bv.user_id, bv.vote, bv.comment, bv.score_sheet, bv.created_at
  FROM public.battle_votes bv
  WHERE bv.battle_id = p_battle_id
    AND bv.score_sheet IS NOT NULL
  ORDER BY bv.created_at ASC;
END;$$;

GRANT EXECUTE ON FUNCTION public.get_battle_score_breakdown(uuid) TO authenticated;

-- Archived battle breakdown
CREATE OR REPLACE FUNCTION public.get_archived_battle_score_breakdown(
  p_archived_battle_id uuid
) RETURNS TABLE (
  user_id uuid,
  vote char(1),
  comment text,
  score_sheet jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_uid uuid;
  v_p1 uuid;
  v_p2 uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT player1_user_id, player2_user_id INTO v_p1, v_p2
  FROM public.archived_battles WHERE id = p_archived_battle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'archived_battle_not_found';
  END IF;
  IF v_uid <> v_p1 AND v_uid <> v_p2 THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT abv.user_id, abv.vote, abv.comment, abv.score_sheet, abv.created_at
  FROM public.archived_battle_votes abv
  WHERE abv.archived_battle_id = p_archived_battle_id
    AND abv.score_sheet IS NOT NULL
  ORDER BY abv.created_at ASC;
END;$$;

GRANT EXECUTE ON FUNCTION public.get_archived_battle_score_breakdown(uuid) TO authenticated;

COMMIT;
