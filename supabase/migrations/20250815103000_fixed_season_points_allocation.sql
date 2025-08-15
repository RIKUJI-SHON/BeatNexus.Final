/*
  # Season points: switch to fixed allocation (win +16, loss +4, draw +8)

  Summary:
  - Replace Elo-based season_points updates with fixed points regardless of K-factor.
  - Keep existing behavior for deleted users: do not update deleted users; apply points only to non-deleted participants.
  - Maintain minimum floor at 1100.

  Notes:
  - Signature unchanged: public.update_season_points_after_battle(p_battle_id uuid, p_winner_id uuid DEFAULT NULL)
  - Return JSON shape preserved with additional field calculation_method='fixed_points_v1'.
*/

CREATE OR REPLACE FUNCTION public.update_season_points_after_battle(
  p_battle_id uuid,
  p_winner_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_battle RECORD;
  v_player1_season_points INTEGER;
  v_player2_season_points INTEGER;
  v_player1_new_points INTEGER;
  v_player2_new_points INTEGER;
  v_player1_change INTEGER := 0;
  v_player2_change INTEGER := 0;
  v_current_season_id UUID;
  v_player1_deleted BOOLEAN := FALSE;
  v_player2_deleted BOOLEAN := FALSE;
BEGIN
  -- 1) Ensure active season exists
  SELECT id INTO v_current_season_id
  FROM seasons
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_current_season_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'アクティブなシーズンが見つかりません'
    );
  END IF;

  -- 2) Resolve battle participants (prefer archived; fallback to active)
  SELECT 
    ab.player1_user_id,
    ab.player2_user_id,
    ab.battle_format
  INTO v_battle
  FROM archived_battles ab
  WHERE ab.original_battle_id = p_battle_id OR ab.id = p_battle_id;

  IF NOT FOUND THEN
    SELECT 
      player1_user_id,
      player2_user_id,
      battle_format
    INTO v_battle
    FROM active_battles
    WHERE id = p_battle_id;
  END IF;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'battle_not_found',
      'message', 'バトルが見つかりません'
    );
  END IF;

  -- 3) Deletion flags
  SELECT COALESCE(is_deleted, FALSE) INTO v_player1_deleted FROM profiles WHERE id = v_battle.player1_user_id;
  SELECT COALESCE(is_deleted, FALSE) INTO v_player2_deleted FROM profiles WHERE id = v_battle.player2_user_id;

  -- 4) Current season points (only for non-deleted)
  IF NOT v_player1_deleted THEN
    SELECT season_points INTO v_player1_season_points FROM profiles WHERE id = v_battle.player1_user_id;
  END IF;
  IF NOT v_player2_deleted THEN
    SELECT season_points INTO v_player2_season_points FROM profiles WHERE id = v_battle.player2_user_id;
  END IF;

  -- 5) Fixed allocation
  --   Win: +16, Loss: +4, Draw: +8 (both)
  IF p_winner_id IS NULL THEN
    -- Draw
    IF NOT v_player1_deleted THEN v_player1_change := 8; END IF;
    IF NOT v_player2_deleted THEN v_player2_change := 8; END IF;
  ELSIF p_winner_id = v_battle.player1_user_id THEN
    -- Player1 wins
    IF NOT v_player1_deleted THEN v_player1_change := 16; END IF;
    IF NOT v_player2_deleted THEN v_player2_change := 4; END IF;
  ELSIF p_winner_id = v_battle.player2_user_id THEN
    -- Player2 wins
    IF NOT v_player2_deleted THEN v_player2_change := 16; END IF;
    IF NOT v_player1_deleted THEN v_player1_change := 4; END IF;
  ELSE
    -- Unknown winner id (should not happen) -> treat as no change
    v_player1_change := 0;
    v_player2_change := 0;
  END IF;

  -- 6) Apply floor 1100 and update profiles (only non-deleted)
  IF NOT v_player1_deleted THEN
    v_player1_new_points := GREATEST(v_player1_season_points + v_player1_change, 1100);
    UPDATE profiles SET season_points = v_player1_new_points, updated_at = NOW()
    WHERE id = v_battle.player1_user_id;
  END IF;
  IF NOT v_player2_deleted THEN
    v_player2_new_points := GREATEST(v_player2_season_points + v_player2_change, 1100);
    UPDATE profiles SET season_points = v_player2_new_points, updated_at = NOW()
    WHERE id = v_battle.player2_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'season_id', v_current_season_id,
    'battle_format', v_battle.battle_format,
    'calculation_method', 'fixed_points_v1',
    'is_tie', (p_winner_id IS NULL),
    'player1_deleted', v_player1_deleted,
    'player2_deleted', v_player2_deleted,
    'player1_points', json_build_object(
      'old_points', COALESCE(v_player1_season_points, 0),
      'change', COALESCE(v_player1_change, 0),
      'new_points', COALESCE(v_player1_new_points, v_player1_season_points, 0)
    ),
    'player2_points', json_build_object(
      'old_points', COALESCE(v_player2_season_points, 0),
      'change', COALESCE(v_player2_change, 0),
      'new_points', COALESCE(v_player2_new_points, v_player2_season_points, 0)
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to update season points (fixed allocation)',
      'error_details', SQLERRM
    );
END;
$function$;
