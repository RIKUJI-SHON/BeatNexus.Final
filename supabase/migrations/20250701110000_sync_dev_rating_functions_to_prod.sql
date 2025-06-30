-- This migration updates the rating calculation functions on the development environment to match the production environment.
-- The existing functions in development had outdated parameter types, causing the `process_expired_battles` function to fail.

-- Update calculate_elo_rating_with_format
CREATE OR REPLACE FUNCTION public.calculate_elo_rating_with_format(
    winner_rating integer,
    loser_rating integer,
    battle_format text DEFAULT 'MAIN_BATTLE'::text)
  RETURNS json
  LANGUAGE plpgsql
AS $function$
DECLARE
  k_factor INTEGER;
  expected_winner NUMERIC;
  expected_loser NUMERIC;
  new_winner_rating INTEGER;
  new_loser_rating INTEGER;
BEGIN
  k_factor := get_k_factor_by_format(battle_format);
  expected_winner := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 / (1.0 + power(10.0, (winner_rating - loser_rating) / 400.0));
  new_winner_rating := winner_rating + k_factor * (1.0 - expected_winner);
  new_loser_rating := loser_rating + k_factor * (0.0 - expected_loser);
  new_winner_rating := GREATEST(new_winner_rating, 1100);
  new_loser_rating := GREATEST(new_loser_rating, 1100);
  RETURN json_build_object(
    'winner_rating', new_winner_rating,
    'loser_rating', new_loser_rating,
    'rating_change_winner', new_winner_rating - winner_rating,
    'rating_change_loser', new_loser_rating - loser_rating,
    'k_factor_used', k_factor,
    'battle_format', battle_format
  );
END;
$function$;

-- Update calculate_tie_rating_with_format
CREATE OR REPLACE FUNCTION public.calculate_tie_rating_with_format(
    player1_rating integer,
    player2_rating integer,
    battle_format text)
  RETURNS json
  LANGUAGE plpgsql
AS $function$
DECLARE
  k_factor INTEGER;
  player1_change INTEGER;
  player2_change INTEGER;
  new_player1_rating INTEGER;
  new_player2_rating INTEGER;
BEGIN
  k_factor := get_k_factor_by_format(battle_format);
  player1_change := calculate_elo_rating_change(player1_rating, player2_rating, 0.5, k_factor);
  player2_change := calculate_elo_rating_change(player2_rating, player1_rating, 0.5, k_factor);
  new_player1_rating := GREATEST(player1_rating + player1_change, 1100);
  new_player2_rating := GREATEST(player2_rating + player2_change, 1100);
  RETURN json_build_object(
    'player1_rating', new_player1_rating,
    'player2_rating', new_player2_rating,
    'player1_change', new_player1_rating - player1_rating,
    'player2_change', new_player2_rating - player2_rating,
    'k_factor_used', k_factor,
    'battle_format', battle_format
  );
END;
$function$;

COMMENT ON FUNCTION public.calculate_elo_rating_with_format(integer, integer, text) IS 'v2: Matches production. Calculates ELO rating with K-factor based on text battle_format.';
COMMENT ON FUNCTION public.calculate_tie_rating_with_format(integer, integer, text) IS 'v2: Matches production. Calculates tie rating with K-factor based on text battle_format.'; 