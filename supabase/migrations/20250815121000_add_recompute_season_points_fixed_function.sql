/*
  # Backfill: Recompute season_points for current season with fixed allocation

  Purpose:
  - Provide an idempotent, dry-runnable function to recompute season_points for a season
    using the new fixed allocation (Win +16, Loss +4, Draw +8), without touching ratings.
  - Only updates non-deleted users (profiles.is_deleted = false).
  - Base points are 1200; floor at 1100 (not practically reached with non-negative deltas).

  Usage examples:
  -- Dry run for active season
  -- SELECT public.recompute_season_points_fixed(NULL, 1200, TRUE);

  -- Apply for active season
  -- SELECT public.recompute_season_points_fixed(NULL, 1200, FALSE);

  -- Dry run for a specific season
  -- SELECT public.recompute_season_points_fixed('00000000-0000-0000-0000-000000000000', 1200, TRUE);
*/

CREATE OR REPLACE FUNCTION public.recompute_season_points_fixed(
  p_season_id uuid DEFAULT NULL,
  p_base_points integer DEFAULT 1200,
  p_dry_run boolean DEFAULT TRUE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_season_id uuid;
  v_total_battles int := 0;
  v_participants int := 0;
  v_skipped_deleted int := 0;
BEGIN
  -- Resolve season
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
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'アクティブなシーズンが見つかりません'
    );
  END IF;

  WITH battles AS (
    SELECT *
    FROM archived_battles ab
    WHERE ab.season_id = v_season_id
  ),
  deltas AS (
    -- Player1 perspective
    SELECT
      b.player1_user_id AS user_id,
      CASE
        WHEN b.winner_id IS NULL THEN 8
        WHEN b.winner_id = b.player1_user_id THEN 16
        WHEN b.winner_id = b.player2_user_id THEN 4
        ELSE 0
      END::int AS delta
    FROM battles b
    UNION ALL
    -- Player2 perspective
    SELECT
      b.player2_user_id AS user_id,
      CASE
        WHEN b.winner_id IS NULL THEN 8
        WHEN b.winner_id = b.player2_user_id THEN 16
        WHEN b.winner_id = b.player1_user_id THEN 4
        ELSE 0
      END::int AS delta
    FROM battles b
  ),
  totals AS (
    SELECT d.user_id, SUM(d.delta)::int AS total_delta
    FROM deltas d
    GROUP BY d.user_id
  ),
  joined AS (
    SELECT t.user_id,
           t.total_delta,
           p.season_points AS old_points,
           GREATEST(p_base_points + t.total_delta, 1100) AS new_points,
           COALESCE(p.is_deleted, FALSE) AS is_deleted
    FROM totals t
    JOIN profiles p ON p.id = t.user_id
  ),
  active_users AS (
    SELECT * FROM joined WHERE is_deleted = FALSE
  ),
  deleted_users AS (
    SELECT * FROM joined WHERE is_deleted = TRUE
  ),
  applied AS (
    -- Perform updates only when p_dry_run = FALSE
    SELECT CASE WHEN p_dry_run THEN 0 ELSE 1 END AS will_update
  )
  SELECT
    (SELECT COUNT(*) FROM battles),
    (SELECT COUNT(*) FROM active_users),
    (SELECT COUNT(*) FROM deleted_users)
  INTO v_total_battles, v_participants, v_skipped_deleted;

  IF NOT p_dry_run THEN
    WITH battles AS (
      SELECT *
      FROM archived_battles ab
      WHERE ab.season_id = v_season_id
    ),
    deltas AS (
      SELECT b.player1_user_id AS user_id,
             CASE
               WHEN b.winner_id IS NULL THEN 8
               WHEN b.winner_id = b.player1_user_id THEN 16
               WHEN b.winner_id = b.player2_user_id THEN 4
               ELSE 0
             END::int AS delta
      FROM battles b
      UNION ALL
      SELECT b.player2_user_id AS user_id,
             CASE
               WHEN b.winner_id IS NULL THEN 8
               WHEN b.winner_id = b.player2_user_id THEN 16
               WHEN b.winner_id = b.player1_user_id THEN 4
               ELSE 0
             END::int AS delta
      FROM battles b
    ),
    totals AS (
      SELECT d.user_id, SUM(d.delta)::int AS total_delta
      FROM deltas d
      GROUP BY d.user_id
    ),
    joined AS (
      SELECT t.user_id,
             t.total_delta,
             p.season_points AS old_points,
             GREATEST(p_base_points + t.total_delta, 1100) AS new_points,
             COALESCE(p.is_deleted, FALSE) AS is_deleted
      FROM totals t
      JOIN profiles p ON p.id = t.user_id
    ),
    active_users AS (
      SELECT * FROM joined WHERE is_deleted = FALSE
    )
    UPDATE profiles p
    SET season_points = au.new_points,
        updated_at = NOW()
    FROM active_users au
    WHERE p.id = au.user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'season_id', v_season_id,
    'base_points', p_base_points,
    'dry_run', p_dry_run,
    'total_battles', v_total_battles,
    'participants', v_participants,
    'skipped_deleted_users', v_skipped_deleted,
    'changes_preview', (
      SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json)
      FROM (
        WITH battles AS (
          SELECT *
          FROM archived_battles ab
          WHERE ab.season_id = v_season_id
        ),
        deltas AS (
          SELECT b.player1_user_id AS user_id,
                 CASE
                   WHEN b.winner_id IS NULL THEN 8
                   WHEN b.winner_id = b.player1_user_id THEN 16
                   WHEN b.winner_id = b.player2_user_id THEN 4
                   ELSE 0
                 END::int AS delta
          FROM battles b
          UNION ALL
          SELECT b.player2_user_id AS user_id,
                 CASE
                   WHEN b.winner_id IS NULL THEN 8
                   WHEN b.winner_id = b.player2_user_id THEN 16
                   WHEN b.winner_id = b.player1_user_id THEN 4
                   ELSE 0
                 END::int AS delta
          FROM battles b
        ),
        totals AS (
          SELECT d.user_id, SUM(d.delta)::int AS total_delta
          FROM deltas d
          GROUP BY d.user_id
        ),
        joined AS (
          SELECT t.user_id,
                 t.total_delta,
                 p.season_points AS old_points,
                 GREATEST(p_base_points + t.total_delta, 1100) AS new_points,
                 COALESCE(p.is_deleted, FALSE) AS is_deleted
          FROM totals t
          JOIN profiles p ON p.id = t.user_id
        ),
        active_users AS (
          SELECT * FROM joined WHERE is_deleted = FALSE
        )
        SELECT user_id, old_points, new_points, (new_points - old_points) AS change, total_delta
        FROM active_users
        ORDER BY total_delta DESC
        LIMIT 50
      ) x
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'recompute_failed',
      'error_details', SQLERRM
    );
END;
$function$;
