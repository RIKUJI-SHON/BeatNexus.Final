/*
  # Utility: Snapshot current season_points for rollback/audit

  - Adds table public.season_points_snapshots to store a point-in-time copy
    of profiles.season_points per season.
  - Adds function public.snapshot_season_points(p_season_id uuid default NULL, p_note text default NULL)
    to capture a snapshot for the active season (or specified season).
*/

CREATE TABLE IF NOT EXISTS public.season_points_snapshots (
  id bigserial PRIMARY KEY,
  season_id uuid NOT NULL,
  user_id uuid NOT NULL,
  season_points integer NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT NOW(),
  note text
);

CREATE INDEX IF NOT EXISTS idx_sps_season_user ON public.season_points_snapshots (season_id, user_id);

CREATE OR REPLACE FUNCTION public.snapshot_season_points(
  p_season_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_season_id uuid;
  v_rows int := 0;
BEGIN
  IF p_season_id IS NULL THEN
    SELECT id
    INTO v_season_id
    FROM seasons
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    v_season_id := p_season_id;
  END IF;

  IF v_season_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_active_season');
  END IF;

  INSERT INTO public.season_points_snapshots (season_id, user_id, season_points, note)
  SELECT v_season_id, p.id, p.season_points, p_note
  FROM public.profiles p;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'season_id', v_season_id,
    'captured_rows', v_rows,
    'note', p_note
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'snapshot_failed',
      'error_details', SQLERRM
    );
END;
$function$;
