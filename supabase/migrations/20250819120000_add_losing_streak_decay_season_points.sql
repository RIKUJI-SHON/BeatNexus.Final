-- Migration: Add losing streak decay to season points allocation
-- Date: 2025-08-19
-- Description: Introduce helper function to compute consecutive losses (excluding current battle) and
--              modify season points function to apply loss decay (4 -> 2 -> 0) while keeping Win +16 / Draw +8.

CREATE INDEX IF NOT EXISTS idx_archived_battles_season_player1 ON public.archived_battles(season_id, player1_user_id, archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_battles_season_player2 ON public.archived_battles(season_id, player2_user_id, archived_at DESC);

CREATE OR REPLACE FUNCTION public.get_loss_streak_before_battle(
  p_user_id uuid,
  p_season_id uuid,
  p_battle_original_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $$
DECLARE
  v_streak INTEGER := 0;
  rec RECORD;
  v_excluded_archived_id uuid;
BEGIN
  SELECT id INTO v_excluded_archived_id
  FROM archived_battles
  WHERE original_battle_id = p_battle_original_id OR id = p_battle_original_id
  LIMIT 1;

  FOR rec IN
    SELECT id, winner_id, player1_user_id, player2_user_id, archived_at
    FROM archived_battles
    WHERE season_id = p_season_id
      AND (player1_user_id = p_user_id OR player2_user_id = p_user_id)
      AND (v_excluded_archived_id IS NULL OR id <> v_excluded_archived_id)
    ORDER BY archived_at DESC
  LOOP
    IF rec.winner_id IS NULL THEN EXIT; -- draw break
    ELSIF rec.winner_id = p_user_id THEN EXIT; -- win break
    ELSE v_streak := v_streak + 1; END IF; -- loss
  END LOOP;
  RETURN v_streak;
END;$$;
COMMENT ON FUNCTION public.get_loss_streak_before_battle IS 'Returns consecutive loss count for user within season BEFORE current battle (identified by original battle id).';

CREATE OR REPLACE FUNCTION public.update_season_points_after_battle(
  p_battle_id uuid,
  p_winner_id uuid DEFAULT NULL::uuid
) RETURNS json
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

  SELECT COALESCE(is_deleted,false) INTO v_player1_deleted FROM profiles WHERE id = v_battle.player1_user_id;
  SELECT COALESCE(is_deleted,false) INTO v_player2_deleted FROM profiles WHERE id = v_battle.player2_user_id;
  IF NOT v_player1_deleted THEN SELECT season_points INTO v_player1_season_points FROM profiles WHERE id=v_battle.player1_user_id; END IF;
  IF NOT v_player2_deleted THEN SELECT season_points INTO v_player2_season_points FROM profiles WHERE id=v_battle.player2_user_id; END IF;

  IF NOT v_player1_deleted THEN v_player1_loss_streak_before := get_loss_streak_before_battle(v_battle.player1_user_id, v_current_season_id, p_battle_id); END IF;
  IF NOT v_player2_deleted THEN v_player2_loss_streak_before := get_loss_streak_before_battle(v_battle.player2_user_id, v_current_season_id, p_battle_id); END IF;

  IF p_winner_id IS NULL THEN
    IF NOT v_player1_deleted THEN v_player1_change := 8; v_player1_loss_streak_after := 0; END IF;
    IF NOT v_player2_deleted THEN v_player2_change := 8; v_player2_loss_streak_after := 0; END IF;
  ELSIF p_winner_id = v_battle.player1_user_id THEN
    IF NOT v_player1_deleted THEN v_player1_change := 16; v_player1_loss_streak_after := 0; END IF;
    IF NOT v_player2_deleted THEN v_player2_change := CASE v_player2_loss_streak_before WHEN 0 THEN 4 WHEN 1 THEN 2 ELSE 0 END; v_player2_loss_streak_after := v_player2_loss_streak_before + 1; END IF;
  ELSIF p_winner_id = v_battle.player2_user_id THEN
    IF NOT v_player2_deleted THEN v_player2_change := 16; v_player2_loss_streak_after := 0; END IF;
    IF NOT v_player1_deleted THEN v_player1_change := CASE v_player1_loss_streak_before WHEN 0 THEN 4 WHEN 1 THEN 2 ELSE 0 END; v_player1_loss_streak_after := v_player1_loss_streak_before + 1; END IF;
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
END;$$;
COMMENT ON FUNCTION public.update_season_points_after_battle IS 'Season points allocation with losing streak decay (Win+16 / Draw+8 / Loss: 4→2→0).';
