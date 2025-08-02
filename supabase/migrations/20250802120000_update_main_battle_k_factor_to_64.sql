/*
  # Update MAIN_BATTLE K-factor from 32 to 64

  This migration updates the K-factor for MAIN_BATTLE format from 32 to 64 
  to increase rating volatility for main battles.
  
  Changes:
  - MAIN_BATTLE: 32 → 64 (doubled for higher impact)
  - MINI_BATTLE: 24 (unchanged)
  - THEME_CHALLENGE: 20 (unchanged)
  - Default: 64 (updated to match MAIN_BATTLE)
  
  Impact:
  - Future battles will use the new K-factor
  - Existing archived battles are not affected
  - Rating changes will be more significant for MAIN_BATTLE format
*/

-- Update K-factor function with new MAIN_BATTLE value
CREATE OR REPLACE FUNCTION public.get_k_factor_by_format(battle_format text)
RETURNS integer
LANGUAGE plpgsql
AS $function$
BEGIN
  CASE battle_format
    WHEN 'MAIN_BATTLE' THEN RETURN 64;      -- Updated: 32 → 64 (doubled impact)
    WHEN 'MINI_BATTLE' THEN RETURN 24;      -- Unchanged: moderate impact
    WHEN 'THEME_CHALLENGE' THEN RETURN 20;  -- Unchanged: conservative impact
    ELSE RETURN 64; -- Updated default to match MAIN_BATTLE
  END CASE;
END;
$function$;

-- Add comment to document the change
COMMENT ON FUNCTION public.get_k_factor_by_format(text) IS 
'バトル形式別Kファクター取得関数：MAIN_BATTLE(64), MINI_BATTLE(24), THEME_CHALLENGE(20)を返す。2025-08-02: MAIN_BATTLEを32から64に変更してレーティング変動を倍増。';
