-- Fix: align payment_status enum and add points update for SuperTip votes (new only)

CREATE OR REPLACE FUNCTION public.apply_supertip_vote(
  p_sender_user_id uuid,
  p_battle_id uuid,
  p_vote character,
  p_comment text,
  p_super_tip_amount integer,
  p_payment_intent_id text,
  p_super_tip_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing public.battle_votes;
  v_is_new boolean := false;
  v_current_season_id uuid;
  v_season_found boolean := false;
BEGIN
  IF p_sender_user_id IS NULL OR p_battle_id IS NULL OR p_vote NOT IN ('A','B') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_params');
  END IF;

  -- Get current active season (optional)
  SELECT id INTO v_current_season_id
  FROM public.seasons 
  WHERE status = 'active' AND start_at <= now() AND end_at >= now()
  ORDER BY start_at DESC
  LIMIT 1;
  v_season_found := v_current_season_id IS NOT NULL;

  -- Check existing vote
  SELECT * INTO v_existing
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = p_sender_user_id;

  IF NOT FOUND THEN
    -- Insert new vote with super tip linkage
    INSERT INTO public.battle_votes (
      battle_id, user_id, vote, comment,
      super_tip_amount, stripe_payment_intent_id, payment_status,
      season_id, is_super_tip_vote, super_tip_id
    ) VALUES (
      p_battle_id, p_sender_user_id, p_vote, COALESCE(p_comment, ''),
      GREATEST(p_super_tip_amount, 0), p_payment_intent_id, 'succeeded',
      v_current_season_id, true, p_super_tip_id
    );

    -- Increment counters on active_battles
    IF p_vote = 'A' THEN
      UPDATE public.active_battles SET votes_a = votes_a + 1 WHERE id = p_battle_id;
    ELSE
      UPDATE public.active_battles SET votes_b = votes_b + 1 WHERE id = p_battle_id;
    END IF;

    -- Update voter points: treat as comment vote (+3 total, +3 season if active)
    UPDATE public.profiles
    SET 
      vote_count = COALESCE(vote_count, 0) + 3,
      season_vote_points = COALESCE(season_vote_points, 0) + CASE WHEN v_season_found THEN 3 ELSE 0 END,
      updated_at = NOW()
    WHERE id = p_sender_user_id;

    v_is_new := true;
  ELSE
    -- Already voted: do not change counts or points; attach super tip linkage and details
    UPDATE public.battle_votes
    SET 
      comment = COALESCE(NULLIF(p_comment, ''), comment),
      super_tip_amount = GREATEST(p_super_tip_amount, COALESCE(super_tip_amount, 0)),
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
      payment_status = 'succeeded',
      is_super_tip_vote = true,
      super_tip_id = COALESCE(p_super_tip_id, super_tip_id)
    WHERE battle_id = p_battle_id AND user_id = p_sender_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'is_new_vote', v_is_new,
    'season_found', v_season_found
  );
END;
$$;

COMMENT ON FUNCTION public.apply_supertip_vote(uuid, uuid, character, text, integer, text, uuid)
IS 'On payment_intent.succeeded, materialize SuperTip vote into battle_votes (new only increments counters and +3 voter points; season +3 if active).';
