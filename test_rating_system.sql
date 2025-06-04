-- ========================================
-- レートシステムのテスト用SQL
-- SupabaseのSQL Editorで実行してください
-- ========================================

-- Step 1: profilesテーブルにratingカラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 1200 NOT NULL;

-- Add index for rating queries
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating);

-- Update existing profiles to have default rating 1200
UPDATE public.profiles SET rating = 1200 WHERE rating IS NULL;

-- Step 2: ELO レート計算関数を作成
CREATE OR REPLACE FUNCTION calculate_elo_rating(
  winner_rating INTEGER,
  loser_rating INTEGER,
  k_factor INTEGER DEFAULT 32
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  expected_winner NUMERIC;
  expected_loser NUMERIC;
  new_winner_rating INTEGER;
  new_loser_rating INTEGER;
BEGIN
  -- Calculate expected scores (probability of winning)
  expected_winner := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 / (1.0 + power(10.0, (winner_rating - loser_rating) / 400.0));
  
  -- Calculate new ratings
  new_winner_rating := winner_rating + k_factor * (1.0 - expected_winner);
  new_loser_rating := loser_rating + k_factor * (0.0 - expected_loser);
  
  -- Ensure ratings don't go below minimum (800)
  new_winner_rating := GREATEST(new_winner_rating, 800);
  new_loser_rating := GREATEST(new_loser_rating, 800);
  
  RETURN json_build_object(
    'winner_rating', new_winner_rating,
    'loser_rating', new_loser_rating,
    'rating_change_winner', new_winner_rating - winner_rating,
    'rating_change_loser', new_loser_rating - loser_rating
  );
END;
$$;

-- Step 3: process_expired_battles関数を更新（レート計算を含む）
CREATE OR REPLACE FUNCTION public.process_expired_battles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_winner_id UUID;
  v_loser_id UUID;
  v_winner_rating INTEGER;
  v_loser_rating INTEGER;
  v_rating_calc JSON;
BEGIN
  FOR rec IN
    SELECT * FROM public.active_battles
    WHERE end_voting_at < now() AND status = 'ACTIVE'
  LOOP
    BEGIN
      -- Mark as processing to avoid double handling
      UPDATE public.active_battles
      SET status = 'PROCESSING_RESULTS', updated_at = now()
      WHERE id = rec.id;

      -- Determine winner and loser
      IF rec.votes_a > rec.votes_b THEN
        v_winner_id := rec.player1_user_id;
        v_loser_id := rec.player2_user_id;
      ELSIF rec.votes_b > rec.votes_a THEN
        v_winner_id := rec.player2_user_id;
        v_loser_id := rec.player1_user_id;
      ELSE
        v_winner_id := NULL; -- tie
        v_loser_id := NULL;
      END IF;

      -- Update ratings if there's a winner (not a tie)
      IF v_winner_id IS NOT NULL AND v_loser_id IS NOT NULL THEN
        -- Get current ratings
        SELECT rating INTO v_winner_rating 
        FROM public.profiles WHERE id = v_winner_id;
        
        SELECT rating INTO v_loser_rating 
        FROM public.profiles WHERE id = v_loser_id;
        
        -- Calculate new ratings using ELO system
        SELECT calculate_elo_rating(v_winner_rating, v_loser_rating) INTO v_rating_calc;
        
        -- Update ratings in profiles table
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'winner_rating')::INTEGER,
            updated_at = now()
        WHERE id = v_winner_id;
        
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'loser_rating')::INTEGER,
            updated_at = now()
        WHERE id = v_loser_id;
        
        -- Log rating changes (visible in logs)
        RAISE NOTICE 'Rating updated for battle %: Winner % (% -> %), Loser % (% -> %)', 
          rec.id, 
          v_winner_id, v_winner_rating, (v_rating_calc->>'winner_rating')::INTEGER,
          v_loser_id, v_loser_rating, (v_rating_calc->>'loser_rating')::INTEGER;
      END IF;

      -- Archive into archived_battles
      INSERT INTO public.archived_battles (
        original_battle_id,
        winner_id,
        final_votes_a,
        final_votes_b,
        battle_format,
        player1_user_id,
        player2_user_id,
        player1_submission_id,
        player2_submission_id,
        archived_at,
        created_at,
        updated_at
      ) VALUES (
        rec.id,
        v_winner_id,
        rec.votes_a,
        rec.votes_b,
        rec.battle_format,
        rec.player1_user_id,
        rec.player2_user_id,
        rec.player1_submission_id,
        rec.player2_submission_id,
        now(),
        now(),
        now()
      );

      -- Update submissions status to BATTLE_ENDED
      UPDATE public.submissions
      SET status = 'BATTLE_ENDED', updated_at = now()
      WHERE id IN (rec.player1_submission_id, rec.player2_submission_id);

      -- Remove from active_battles
      DELETE FROM public.active_battles WHERE id = rec.id;

    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue with next battle
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Step 4: 新しいランキングビューを作成（レートベース）
DROP VIEW IF EXISTS public.rankings_view CASCADE;

CREATE VIEW public.rankings_view AS
WITH battle_stats AS (
  SELECT 
    winner_id as user_id,
    COUNT(*) as battles_won
  FROM public.archived_battles 
  WHERE winner_id IS NOT NULL
  GROUP BY winner_id
  
  UNION ALL
  
  SELECT 
    player1_user_id as user_id,
    0 as battles_won
  FROM public.archived_battles 
  WHERE winner_id != player1_user_id OR winner_id IS NULL
  
  UNION ALL
  
  SELECT 
    player2_user_id as user_id,
    0 as battles_won
  FROM public.archived_battles 
  WHERE winner_id != player2_user_id OR winner_id IS NULL
),
aggregated_stats AS (
  SELECT 
    user_id,
    SUM(battles_won) as battles_won,
    COUNT(*) - SUM(battles_won) as battles_lost
  FROM battle_stats
  GROUP BY user_id
)
SELECT 
  p.id as user_id,
  p.username,
  p.avatar_url,
  p.rating,
  p.rating as season_points, -- Use rating as season points
  COALESCE(s.battles_won, 0) as battles_won,
  COALESCE(s.battles_lost, 0) as battles_lost,
  ROW_NUMBER() OVER (ORDER BY p.rating DESC) as position
FROM public.profiles p
LEFT JOIN aggregated_stats s ON p.id = s.user_id
ORDER BY p.rating DESC;

-- Step 5: ビューの権限設定
ALTER VIEW public.rankings_view OWNER TO postgres;
GRANT SELECT ON public.rankings_view TO authenticated, anon;

-- Step 6: テスト用データでレート計算をテスト
-- ELO計算をテスト（1200 vs 1200の場合）
SELECT calculate_elo_rating(1200, 1200) AS equal_rating_test;

-- ELO計算をテスト（1400 vs 1000の場合）
SELECT calculate_elo_rating(1400, 1000) AS higher_vs_lower_test;

-- プロフィールのレート確認
SELECT id, username, rating FROM public.profiles ORDER BY rating DESC;

-- ランキングビューの確認
SELECT * FROM public.rankings_view;

-- 完了メッセージ
SELECT 'レートシステムのセットアップが完了しました！' as status; 