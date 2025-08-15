/*
  # Season Rankings Tiebreaks: season_user_metrics, updater, backfill, view, trigger

  - Adds season_user_metrics table to store per-season per-user vote metrics
  - Adds updater function called after battle archive (trigger)
  - Adds recompute function for backfill
  - Adds ranking view ordered by season_points and tiebreak metrics
*/

-- 1) Table
CREATE TABLE IF NOT EXISTS public.season_user_metrics (
  season_id uuid NOT NULL,
  user_id uuid NOT NULL,
  battles_played int NOT NULL DEFAULT 0,
  total_votes_for int NOT NULL DEFAULT 0,
  total_votes_against int NOT NULL DEFAULT 0,
  total_votes int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  draws int NOT NULL DEFAULT 0,
  weighted_vote_share numeric(6,4) NOT NULL DEFAULT 0.0,
  sum_margin_ratio numeric(7,4) NOT NULL DEFAULT 0.0,
  last_battle_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sum_season_share ON public.season_user_metrics (season_id, weighted_vote_share DESC);
CREATE INDEX IF NOT EXISTS idx_sum_season_margin ON public.season_user_metrics (season_id, sum_margin_ratio DESC);

-- 2) Updater function (single archived battle)
CREATE OR REPLACE FUNCTION public.update_season_vote_metrics_after_battle(p_archived_battle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  b RECORD;
  v_for_a int; v_against_a int; v_total_a int;
  v_for_b int; v_against_b int; v_total_b int;
  v_ratio_a numeric(7,4); v_ratio_b numeric(7,4);
  v_season uuid;
BEGIN
  SELECT * INTO b
  FROM public.archived_battles
  WHERE id = p_archived_battle_id;

  IF NOT FOUND THEN
    RETURN; -- nothing to do
  END IF;

  v_season := b.season_id;

  -- Player A
  v_for_a := COALESCE(b.final_votes_a,0);
  v_against_a := COALESCE(b.final_votes_b,0);
  v_total_a := v_for_a + v_against_a;
  v_ratio_a := CASE WHEN NULLIF(v_total_a,0) IS NULL THEN 0 ELSE (v_for_a - v_against_a)::numeric / v_total_a END;

  -- Player B
  v_for_b := COALESCE(b.final_votes_b,0);
  v_against_b := COALESCE(b.final_votes_a,0);
  v_total_b := v_for_b + v_against_b;
  v_ratio_b := CASE WHEN NULLIF(v_total_b,0) IS NULL THEN 0 ELSE (v_for_b - v_against_b)::numeric / v_total_b END;

  -- Upsert for player1
  INSERT INTO public.season_user_metrics AS m (
    season_id, user_id, battles_played, total_votes_for, total_votes_against,
    total_votes, wins, losses, draws, weighted_vote_share, sum_margin_ratio, last_battle_at, updated_at
  )
  VALUES (
    v_season, b.player1_user_id, 1, v_for_a, v_against_a, v_total_a,
    CASE WHEN b.winner_id = b.player1_user_id THEN 1 ELSE 0 END,
    CASE WHEN b.winner_id = b.player2_user_id THEN 1 ELSE 0 END,
    CASE WHEN b.winner_id IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NULLIF(v_total_a,0) IS NULL THEN 0 ELSE v_for_a::numeric / v_total_a END,
    v_ratio_a,
    b.archived_at, NOW()
  )
  ON CONFLICT (season_id, user_id) DO UPDATE SET
    battles_played = m.battles_played + 1,
    total_votes_for = m.total_votes_for + EXCLUDED.total_votes_for,
    total_votes_against = m.total_votes_against + EXCLUDED.total_votes_against,
    total_votes = m.total_votes + EXCLUDED.total_votes,
    wins = m.wins + EXCLUDED.wins,
    losses = m.losses + EXCLUDED.losses,
    draws = m.draws + EXCLUDED.draws,
    weighted_vote_share = CASE WHEN NULLIF(m.total_votes + EXCLUDED.total_votes,0) IS NULL THEN 0 ELSE (m.total_votes_for + EXCLUDED.total_votes_for)::numeric / (m.total_votes + EXCLUDED.total_votes) END,
    sum_margin_ratio = m.sum_margin_ratio + EXCLUDED.sum_margin_ratio,
    last_battle_at = GREATEST(m.last_battle_at, EXCLUDED.last_battle_at),
    updated_at = NOW();

  -- Upsert for player2
  INSERT INTO public.season_user_metrics AS m (
    season_id, user_id, battles_played, total_votes_for, total_votes_against,
    total_votes, wins, losses, draws, weighted_vote_share, sum_margin_ratio, last_battle_at, updated_at
  )
  VALUES (
    v_season, b.player2_user_id, 1, v_for_b, v_against_b, v_total_b,
    CASE WHEN b.winner_id = b.player2_user_id THEN 1 ELSE 0 END,
    CASE WHEN b.winner_id = b.player1_user_id THEN 1 ELSE 0 END,
    CASE WHEN b.winner_id IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NULLIF(v_total_b,0) IS NULL THEN 0 ELSE v_for_b::numeric / v_total_b END,
    v_ratio_b,
    b.archived_at, NOW()
  )
  ON CONFLICT (season_id, user_id) DO UPDATE SET
    battles_played = m.battles_played + 1,
    total_votes_for = m.total_votes_for + EXCLUDED.total_votes_for,
    total_votes_against = m.total_votes_against + EXCLUDED.total_votes_against,
    total_votes = m.total_votes + EXCLUDED.total_votes,
    wins = m.wins + EXCLUDED.wins,
    losses = m.losses + EXCLUDED.losses,
    draws = m.draws + EXCLUDED.draws,
    weighted_vote_share = CASE WHEN NULLIF(m.total_votes + EXCLUDED.total_votes,0) IS NULL THEN 0 ELSE (m.total_votes_for + EXCLUDED.total_votes_for)::numeric / (m.total_votes + EXCLUDED.total_votes) END,
    sum_margin_ratio = m.sum_margin_ratio + EXCLUDED.sum_margin_ratio,
    last_battle_at = GREATEST(m.last_battle_at, EXCLUDED.last_battle_at),
    updated_at = NOW();
END;
$function$;

-- 3) Trigger on archived_battles insert
DROP TRIGGER IF EXISTS trg_update_season_vote_metrics_after_battle ON public.archived_battles;
-- Use a proper trigger function wrapper
CREATE OR REPLACE FUNCTION public.tg_update_season_vote_metrics_after_battle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $tg$
BEGIN
  PERFORM public.update_season_vote_metrics_after_battle(NEW.id);
  RETURN NEW;
END;
$tg$;

CREATE TRIGGER trg_update_season_vote_metrics_after_battle
AFTER INSERT ON public.archived_battles
FOR EACH ROW EXECUTE FUNCTION public.tg_update_season_vote_metrics_after_battle();

-- 4) Backfill recompute
CREATE OR REPLACE FUNCTION public.recompute_season_vote_metrics(
  p_season_id uuid DEFAULT NULL,
  p_truncate boolean DEFAULT TRUE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_season_id uuid;
  v_rows int := 0;
  v_battles int := 0;
  v_rec record;
BEGIN
  -- Resolve season when NULL: use active season
  IF p_season_id IS NULL THEN
    SELECT id INTO v_season_id FROM public.seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1;
  ELSE
    v_season_id := p_season_id;
  END IF;

  IF v_season_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_active_season');
  END IF;

  IF p_truncate THEN
    DELETE FROM public.season_user_metrics WHERE season_id = v_season_id;
  END IF;

  FOR v_rec IN SELECT id FROM public.archived_battles WHERE season_id = v_season_id ORDER BY archived_at ASC LOOP
    PERFORM public.update_season_vote_metrics_after_battle(v_rec.id);
    v_battles := v_battles + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_rows FROM public.season_user_metrics WHERE season_id = v_season_id;

  RETURN json_build_object('success', true, 'season_id', v_season_id, 'battles_processed', v_battles, 'rows', v_rows);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 5) Ranking view (active season)
CREATE OR REPLACE VIEW public.season_rankings_view AS
WITH current_season AS (
  SELECT id FROM public.seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
)
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.season_points,
  p.rating,
  get_rank_from_rating(p.rating) AS rank_name,
  get_rank_color_from_rating(p.rating) AS rank_color,
  0::integer AS battles_won,
  0::integer AS battles_lost,
  0::numeric AS win_rate,
  p.created_at,
  p.updated_at,
  -- DENSE_RANK with new tiebreaks to preserve natural ranks while differentiating ties
  DENSE_RANK() OVER (
    ORDER BY p.season_points DESC,
             m.weighted_vote_share DESC,
             m.sum_margin_ratio DESC,
             m.battles_played DESC,
             m.last_battle_at DESC,
             p.id ASC
  ) AS position,
  -- Expose tiebreak metrics for optional display/debug
  m.weighted_vote_share,
  m.sum_margin_ratio,
  m.battles_played,
  m.last_battle_at
FROM public.profiles p
JOIN current_season cs ON TRUE
JOIN public.season_user_metrics m ON m.user_id = p.id AND m.season_id = cs.id
WHERE COALESCE(p.is_deleted, FALSE) = FALSE
ORDER BY p.season_points DESC,
         m.weighted_vote_share DESC,
         m.sum_margin_ratio DESC,
         m.battles_played DESC,
         m.last_battle_at DESC,
         p.id ASC;

COMMENT ON VIEW public.season_rankings_view 
IS 'シーズンランキングビュー：参加者のみ表示。season_points同点はweighted_vote_share等でタイブレーク。列互換（avatar_url, rating, rank_name/color, position を提供）';

-- Preserve invoker semantics if previously used
ALTER VIEW public.season_rankings_view SET (security_invoker = true);
