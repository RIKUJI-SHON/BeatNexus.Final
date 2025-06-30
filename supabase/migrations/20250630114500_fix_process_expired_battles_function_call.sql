-- Fixes the process_expired_battles function to call the correct rating calculation function.
-- The previous version was calling a non-existent function `calculate_elo_rating`,
-- causing the process to fail silently.
-- This version corrects the call to use `calculate_elo_rating_with_format`
-- which correctly takes the battle format into account.

-- Drop the faulty function
DROP FUNCTION IF EXISTS public.process_expired_battles();

-- Recreate the function with the correct function call
CREATE OR REPLACE FUNCTION public.process_expired_battles()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    rec RECORD;
    v_winner_id UUID;
    v_loser_id UUID;
    v_winner_rating INTEGER;
    v_loser_rating INTEGER;
    v_rating_calc JSONB; -- Changed to JSONB to match the return type of the correct function
    v_archived_battle_id UUID;
    v_tie BOOLEAN := false;
BEGIN
    FOR rec IN
        SELECT * FROM public.active_battles
        WHERE end_voting_at < now() AND status = 'ACTIVE'
    LOOP
        BEGIN
            -- 1. Mark as processing to avoid double handling
            UPDATE public.active_battles
            SET status = 'PROCESSING_RESULTS', updated_at = now()
            WHERE id = rec.id;

            -- 2. Determine winner, loser, or tie
            IF rec.votes_a > rec.votes_b THEN
                v_winner_id := rec.player1_user_id;
                v_loser_id := rec.player2_user_id;
            ELSIF rec.votes_b > rec.votes_a THEN
                v_winner_id := rec.player2_user_id;
                v_loser_id := rec.player1_user_id;
            ELSE
                v_tie := true;
                v_winner_id := NULL;
                v_loser_id := NULL;
            END IF;

            -- 3. Update ratings if it's not a tie
            IF NOT v_tie THEN
                -- Get current ratings
                SELECT rating INTO v_winner_rating FROM public.profiles WHERE id = v_winner_id;
                SELECT rating INTO v_loser_rating FROM public.profiles WHERE id = v_loser_id;

                -- CORRECTED: Call the existing function `calculate_elo_rating_with_format`
                SELECT public.calculate_elo_rating_with_format(v_winner_rating, v_loser_rating, rec.battle_format) INTO v_rating_calc;

                -- Update ratings in profiles table
                UPDATE public.profiles
                SET rating = (v_rating_calc->>'winner_new_rating')::INTEGER, updated_at = now()
                WHERE id = v_winner_id;

                UPDATE public.profiles
                SET rating = (v_rating_calc->>'loser_new_rating')::INTEGER, updated_at = now()
                WHERE id = v_loser_id;

                RAISE NOTICE 'Ratings updated for battle %: Winner % (new rating: %), Loser % (new rating: %)',
                    rec.id, v_winner_id, (v_rating_calc->>'winner_new_rating'), v_loser_id, (v_rating_calc->>'loser_new_rating');
            ELSE
                 -- In case of a tie, use the specific tie rating function
                SELECT public.calculate_rating_on_tie(rec.player1_user_id, rec.player2_user_id, rec.battle_format) INTO v_rating_calc;

                RAISE NOTICE 'Ratings updated for a tie in battle %: Player1 new rating: %, Player2 new rating: %',
                    rec.id, (v_rating_calc->>'player1_new_rating'), (v_rating_calc->>'player2_new_rating');
            END IF;

            -- 4. Archive into archived_battles
            INSERT INTO public.archived_battles (
                original_battle_id, winner_id, final_votes_a, final_votes_b,
                battle_format, player1_user_id, player2_user_id,
                player1_submission_id, player2_submission_id,
                player1_rating_change, player2_rating_change,
                player1_final_rating, player2_final_rating,
                player1_video_url, player2_video_url, is_tie
            )
            SELECT
                rec.id,
                v_winner_id,
                rec.votes_a,
                rec.votes_b,
                rec.battle_format,
                rec.player1_user_id,
                rec.player2_user_id,
                rec.player1_submission_id,
                rec.player2_submission_id,
                (v_rating_calc->>'winner_rating_change')::integer,
                (v_rating_calc->>'loser_rating_change')::integer,
                (v_rating_calc->>'winner_new_rating')::integer,
                (v_rating_calc->>'loser_new_rating')::integer,
                s1.video_url,
                s2.video_url,
                v_tie
            FROM public.submissions s1, public.submissions s2
            WHERE s1.id = rec.player1_submission_id AND s2.id = rec.player2_submission_id
            RETURNING id INTO v_archived_battle_id;

            -- 5. Copy vote comments to archived_battle_votes
            INSERT INTO public.archived_battle_votes (archived_battle_id, user_id, vote, comment, created_at)
            SELECT v_archived_battle_id, bv.user_id, bv.vote, bv.comment, bv.created_at
            FROM public.battle_votes bv
            WHERE bv.battle_id = rec.id AND bv.comment IS NOT NULL AND bv.comment != '';

            -- 6. Update submissions status to BATTLE_ENDED
            UPDATE public.submissions
            SET status = 'BATTLE_ENDED', updated_at = now()
            WHERE id IN (rec.player1_submission_id, rec.player2_submission_id);

            -- 7. Remove from active_battles (this will CASCADE delete battle_votes)
            DELETE FROM public.active_battles WHERE id = rec.id;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
            -- If something goes wrong, set status back to ACTIVE to retry later
            UPDATE public.active_battles SET status = 'ACTIVE' WHERE id = rec.id;
        END;
    END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_expired_battles() TO postgres;
GRANT EXECUTE ON FUNCTION public.process_expired_battles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_expired_battles() TO service_role;

COMMENT ON FUNCTION public.process_expired_battles() IS 'v2: Processes expired battles, correctly calls calculate_elo_rating_with_format, handles ties, and archives results.'; 