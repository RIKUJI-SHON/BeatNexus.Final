-- 2025-09-03: Unify K-factor and season points rules for MINI (MAIN's half)

-- 1) K-factor function (battle_format enum overload)
CREATE OR REPLACE FUNCTION public.get_k_factor_by_format(battle_format battle_format)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $$
BEGIN
  CASE battle_format
    WHEN 'MAIN_BATTLE' THEN RETURN 64;      -- MAIN
    WHEN 'MINI_BATTLE' THEN RETURN 32;      -- MINI = MAIN / 2
    WHEN 'THEME_CHALLENGE' THEN RETURN 20;  -- THEME
    ELSE RETURN 64;                         -- default MAIN
  END CASE;
END;
$$;

-- 2) K-factor function (text overload)
CREATE OR REPLACE FUNCTION public.get_k_factor_by_format(battle_format text)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public','auth'
AS $$
BEGIN
  CASE UPPER(battle_format)
    WHEN 'MAIN_BATTLE' THEN RETURN 64;      -- MAIN
    WHEN 'MINI_BATTLE' THEN RETURN 32;      -- MINI = MAIN / 2
    WHEN 'THEME_CHALLENGE' THEN RETURN 20;  -- THEME
    ELSE RETURN 64;                         -- default MAIN
  END CASE;
END;
$$;

-- 3) Season points updater: MINI = half of MAIN (Win +8 / Draw +4 / Loss 2→1→0)
CREATE OR REPLACE FUNCTION public.update_season_points_after_battle(
  p_battle_id uuid,
  p_winner_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  v_player1_loss_streak_before INTEGER := 0;
  v_player2_loss_streak_before INTEGER := 0;
  v_player1_loss_streak_after  INTEGER := 0;
  v_player2_loss_streak_after  INTEGER := 0;
  v_is_mini BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_current_season_id FROM seasons WHERE status='active' ORDER BY created_at DESC LIMIT 1;
  IF v_current_season_id IS NULL THEN
    RETURN json_build_object('success', false,'error','no_active_season','message','アクティブなシーズンが見つかりません');
  END IF;

  SELECT ab.player1_user_id, ab.player2_user_id, ab.battle_format INTO v_battle
  FROM archived_battles ab
  WHERE ab.original_battle_id = p_battle_id OR ab.id = p_battle_id;
  IF NOT FOUND THEN
    SELECT player1_user_id, player2_user_id, battle_format INTO v_battle FROM active_battles WHERE id = p_battle_id;
  END IF;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false,'error','battle_not_found','message','バトルが見つかりません');
  END IF;

  v_is_mini := (v_battle.battle_format = 'MINI_BATTLE');

  SELECT COALESCE(is_deleted,false) INTO v_player1_deleted FROM profiles WHERE id = v_battle.player1_user_id;
  SELECT COALESCE(is_deleted,false) INTO v_player2_deleted FROM profiles WHERE id = v_battle.player2_user_id;
  IF NOT v_player1_deleted THEN SELECT season_points INTO v_player1_season_points FROM profiles WHERE id=v_battle.player1_user_id; END IF;
  IF NOT v_player2_deleted THEN SELECT season_points INTO v_player2_season_points FROM profiles WHERE id=v_battle.player2_user_id; END IF;

  IF NOT v_player1_deleted THEN v_player1_loss_streak_before := get_loss_streak_before_battle(v_battle.player1_user_id, v_current_season_id, p_battle_id); END IF;
  IF NOT v_player2_deleted THEN v_player2_loss_streak_before := get_loss_streak_before_battle(v_battle.player2_user_id, v_current_season_id, p_battle_id); END IF;

  -- Draw
  IF p_winner_id IS NULL THEN
    IF NOT v_player1_deleted THEN v_player1_change := CASE WHEN v_is_mini THEN 4 ELSE 8 END; v_player1_loss_streak_after := 0; END IF;
    IF NOT v_player2_deleted THEN v_player2_change := CASE WHEN v_is_mini THEN 4 ELSE 8 END; v_player2_loss_streak_after := 0; END IF;

  -- Player1 wins
  ELSIF p_winner_id = v_battle.player1_user_id THEN
    IF NOT v_player1_deleted THEN v_player1_change := CASE WHEN v_is_mini THEN 8 ELSE 16 END; v_player1_loss_streak_after := 0; END IF;
    IF NOT v_player2_deleted THEN
      v_player2_change := CASE v_player2_loss_streak_before
        WHEN 0 THEN CASE WHEN v_is_mini THEN 2 ELSE 4 END
        WHEN 1 THEN CASE WHEN v_is_mini THEN 1 ELSE 2 END
        ELSE 0 END;
      v_player2_loss_streak_after := v_player2_loss_streak_before + 1;
    END IF;

  -- Player2 wins
  ELSIF p_winner_id = v_battle.player2_user_id THEN
    IF NOT v_player2_deleted THEN v_player2_change := CASE WHEN v_is_mini THEN 8 ELSE 16 END; v_player2_loss_streak_after := 0; END IF;
    IF NOT v_player1_deleted THEN
      v_player1_change := CASE v_player1_loss_streak_before
        WHEN 0 THEN CASE WHEN v_is_mini THEN 2 ELSE 4 END
        WHEN 1 THEN CASE WHEN v_is_mini THEN 1 ELSE 2 END
        ELSE 0 END;
      v_player1_loss_streak_after := v_player1_loss_streak_before + 1;
    END IF;

  ELSE
    v_player1_loss_streak_after := v_player1_loss_streak_before;
    v_player2_loss_streak_after := v_player2_loss_streak_before;
  END IF;

  IF NOT v_player1_deleted THEN
    v_player1_new_points := GREATEST(v_player1_season_points + v_player1_change, 1100);
    UPDATE profiles SET season_points = v_player1_new_points, updated_at = NOW() WHERE id = v_battle.player1_user_id;
  END IF;
  IF NOT v_player2_deleted THEN
    v_player2_new_points := GREATEST(v_player2_season_points + v_player2_change, 1100);
    UPDATE profiles SET season_points = v_player2_new_points, updated_at = NOW() WHERE id = v_battle.player2_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'season_id', v_current_season_id,
    'battle_format', v_battle.battle_format,
    'calculation_method', 'fixed_points_loss_decay_v1',
    'is_tie', (p_winner_id IS NULL),
    'player1_deleted', v_player1_deleted,
    'player2_deleted', v_player2_deleted,
    'player1_points', json_build_object('old_points', COALESCE(v_player1_season_points,0),'change',COALESCE(v_player1_change,0),'new_points', COALESCE(v_player1_new_points,v_player1_season_points,0)),
    'player2_points', json_build_object('old_points', COALESCE(v_player2_season_points,0),'change',COALESCE(v_player2_change,0),'new_points', COALESCE(v_player2_new_points,v_player2_season_points,0)),
    'player1_loss_streak_before', v_player1_loss_streak_before,
    'player1_loss_streak_after', v_player1_loss_streak_after,
    'player2_loss_streak_before', v_player2_loss_streak_before,
    'player2_loss_streak_after', v_player2_loss_streak_after
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false,'error','Failed to update season points (loss decay)','error_details', SQLERRM);
END;
$$;
