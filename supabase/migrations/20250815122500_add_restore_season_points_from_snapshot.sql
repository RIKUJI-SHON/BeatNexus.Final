/*
  # Utility: Restore season_points from latest snapshot

  - Adds function to restore profiles.season_points from season_points_snapshots
    for a given season. Uses the latest captured_at (optionally filtered by note).
*/

CREATE OR REPLACE FUNCTION public.restore_season_points_from_snapshot(
  p_season_id uuid,
  p_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_season_id uuid := p_season_id;
  v_target_ts timestamptz;
  v_rows int := 0;
BEGIN
  IF v_season_id IS NULL THEN
    SELECT id INTO v_season_id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_season_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_active_season');
  END IF;

  SELECT MAX(captured_at) INTO v_target_ts
  FROM public.season_points_snapshots
  WHERE season_id = v_season_id
    AND (p_note IS NULL OR note = p_note);

  IF v_target_ts IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_snapshot');
  END IF;

  WITH latest AS (
    SELECT s.user_id, s.season_points
    FROM public.season_points_snapshots s
    WHERE s.season_id = v_season_id AND s.captured_at = v_target_ts
  )
  UPDATE public.profiles p
  SET season_points = l.season_points,
      updated_at = NOW()
  FROM latest l
  WHERE p.id = l.user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'season_id', v_season_id,
    'restored_rows', v_rows,
    'captured_at', v_target_ts,
    'note', p_note
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'restore_failed', 'error_details', SQLERRM);
END;
$function$;
