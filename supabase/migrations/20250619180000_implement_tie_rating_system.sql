/*
  # 引き分け時レーティング変動システムの実装

  1. 引き分け専用レーティング計算関数の作成
  2. process_expired_battles関数の更新（引き分け時もレーティング更新）
  3. 標準Elo方式（引き分け = 0.5の結果）を採用
*/

-- Step 1: 引き分け時のレーティング計算関数を作成
CREATE OR REPLACE FUNCTION calculate_tie_rating_with_format(
  player1_rating INTEGER,
  player2_rating INTEGER,
  battle_format TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  k_factor INTEGER;
  player1_change INTEGER;
  player2_change INTEGER;
  new_player1_rating INTEGER;
  new_player2_rating INTEGER;
BEGIN
  -- Get K-factor based on battle format
  k_factor := get_k_factor_by_format(battle_format);
  
  -- Calculate rating changes for tie (result = 0.5 for both players)
  player1_change := calculate_elo_rating_change(player1_rating, player2_rating, 0.5, k_factor);
  player2_change := calculate_elo_rating_change(player2_rating, player1_rating, 0.5, k_factor);
  
  -- Apply changes with minimum rating protection
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
$$;

-- Step 2: process_expired_battles関数を更新（引き分け時レーティング計算対応）
CREATE OR REPLACE FUNCTION public.process_expired_battles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_winner_id UUID;
  v_loser_id UUID;
  v_player1_rating INTEGER;
  v_player2_rating INTEGER;
  v_rating_calc JSON;
  v_archived_battle_id UUID;
  v_is_tie BOOLEAN;
BEGIN
  FOR rec IN
    SELECT * FROM public.active_battles
    WHERE end_voting_at < now() AND status = 'ACTIVE'
  LOOP
    BEGIN
      -- 2a. Mark as processing to avoid double handling
      UPDATE public.active_battles
      SET status = 'PROCESSING_RESULTS', updated_at = now()
      WHERE id = rec.id;

      -- 2b. Determine winner, loser, and tie status
      IF rec.votes_a > rec.votes_b THEN
        v_winner_id := rec.player1_user_id;
        v_loser_id := rec.player2_user_id;
        v_is_tie := FALSE;
      ELSIF rec.votes_b > rec.votes_a THEN
        v_winner_id := rec.player2_user_id;
        v_loser_id := rec.player1_user_id;
        v_is_tie := FALSE;
      ELSE
        v_winner_id := NULL; -- tie
        v_loser_id := NULL;
        v_is_tie := TRUE;
      END IF;

      -- 2c. Update ratings (both for wins/losses AND ties)
      -- Get current ratings for both players
      SELECT rating INTO v_player1_rating 
      FROM public.profiles WHERE id = rec.player1_user_id;
      
      SELECT rating INTO v_player2_rating 
      FROM public.profiles WHERE id = rec.player2_user_id;

      IF v_is_tie THEN
        -- 🆕 Handle tie rating calculation using standard Elo (0.5 result)
        SELECT calculate_tie_rating_with_format(v_player1_rating, v_player2_rating, rec.battle_format) INTO v_rating_calc;
        
        -- Update both players' ratings
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'player1_rating')::INTEGER,
            updated_at = now()
        WHERE id = rec.player1_user_id;
        
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'player2_rating')::INTEGER,
            updated_at = now()
        WHERE id = rec.player2_user_id;
        
        -- Log tie rating changes
        RAISE NOTICE 'TIE rating updated for battle %: Player1 % (% -> %), Player2 % (% -> %)', 
          rec.id, 
          rec.player1_user_id, v_player1_rating, (v_rating_calc->>'player1_rating')::INTEGER,
          rec.player2_user_id, v_player2_rating, (v_rating_calc->>'player2_rating')::INTEGER;
          
      ELSE
        -- Handle win/loss rating calculation (existing logic)
        SELECT calculate_elo_rating_with_format(
          CASE WHEN v_winner_id = rec.player1_user_id THEN v_player1_rating ELSE v_player2_rating END,
          CASE WHEN v_winner_id = rec.player1_user_id THEN v_player2_rating ELSE v_player1_rating END,
          rec.battle_format
        ) INTO v_rating_calc;
        
        -- Update ratings based on winner/loser
        IF v_winner_id = rec.player1_user_id THEN
          -- Player 1 won
          UPDATE public.profiles 
          SET rating = (v_rating_calc->>'winner_rating')::INTEGER,
              updated_at = now()
          WHERE id = rec.player1_user_id;
          
          UPDATE public.profiles 
          SET rating = (v_rating_calc->>'loser_rating')::INTEGER,
              updated_at = now()
          WHERE id = rec.player2_user_id;
        ELSE
          -- Player 2 won
          UPDATE public.profiles 
          SET rating = (v_rating_calc->>'winner_rating')::INTEGER,
              updated_at = now()
          WHERE id = rec.player2_user_id;
          
          UPDATE public.profiles 
          SET rating = (v_rating_calc->>'loser_rating')::INTEGER,
              updated_at = now()
          WHERE id = rec.player1_user_id;
        END IF;
        
        -- Log win/loss rating changes
        RAISE NOTICE 'WIN/LOSS rating updated for battle %: Winner % (% -> %), Loser % (% -> %)', 
          rec.id, 
          v_winner_id, 
          CASE WHEN v_winner_id = rec.player1_user_id THEN v_player1_rating ELSE v_player2_rating END,
          (v_rating_calc->>'winner_rating')::INTEGER,
          v_loser_id,
          CASE WHEN v_loser_id = rec.player1_user_id THEN v_player1_rating ELSE v_player2_rating END,
          (v_rating_calc->>'loser_rating')::INTEGER;
      END IF;

      -- 2d. Archive into archived_battles
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
      ) RETURNING id INTO v_archived_battle_id;

      -- 2d-2. Copy vote comments to archived_battle_votes
      INSERT INTO public.archived_battle_votes (
        archived_battle_id,
        user_id,
        vote,
        comment,
        created_at
      )
      SELECT 
        v_archived_battle_id,
        bv.user_id,
        bv.vote,
        bv.comment,
        bv.created_at
      FROM public.battle_votes bv
      WHERE bv.battle_id = rec.id
        AND bv.comment IS NOT NULL
        AND bv.comment != '';

      -- Log comment copying
      RAISE NOTICE 'Copied % vote comments for archived battle %', 
        (SELECT COUNT(*) FROM public.battle_votes 
         WHERE battle_id = rec.id 
           AND comment IS NOT NULL 
           AND comment != ''), 
        v_archived_battle_id;

      -- 2e. Update submissions status to BATTLE_ENDED
      UPDATE public.submissions
      SET status = 'BATTLE_ENDED', updated_at = now()
      WHERE id IN (rec.player1_submission_id, rec.player2_submission_id);

      -- 2f. Remove from active_battles (this will CASCADE delete battle_votes)
      DELETE FROM public.active_battles WHERE id = rec.id;

    EXCEPTION WHEN OTHERS THEN
      -- 2g. Log error and continue with next battle
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Step 3: 権限設定
GRANT EXECUTE ON FUNCTION calculate_tie_rating_with_format(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_expired_battles() TO postgres;

-- Step 4: コメント追加
COMMENT ON FUNCTION calculate_tie_rating_with_format(INTEGER, INTEGER, TEXT) IS '引き分け時のレーティング計算関数：標準Elo方式（結果=0.5）でバトル形式別Kファクターを適用';
COMMENT ON FUNCTION public.process_expired_battles() IS '期限切れバトル処理関数：勝敗判定、レーティング更新（引き分け対応）、アーカイブ保存、投票コメント保持を実行'; 