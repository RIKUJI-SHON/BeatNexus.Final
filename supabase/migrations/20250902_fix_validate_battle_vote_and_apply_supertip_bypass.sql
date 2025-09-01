-- Fix validate_battle_vote to allow server-side bypass via GUC
-- And update apply_supertip_vote to set the bypass flag during insert

BEGIN;

-- 1) Update trigger function to support bypass when a custom GUC is set
CREATE OR REPLACE FUNCTION public.validate_battle_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  battle_record RECORD;
  voter_id UUID;
  bypass_text text := current_setting('app.bypass_vote_auth', true);
  bypass boolean := false;
BEGIN
  IF bypass_text IS NOT NULL AND lower(bypass_text) IN ('1','true','on','t','y') THEN
    bypass := true;
  END IF;

  IF bypass THEN
    -- Trust NEW.user_id set by caller (e.g., SECURITY DEFINER server-side function)
    voter_id := NEW.user_id;
  ELSE
    -- Require authenticated user and set NEW.user_id from auth context
    voter_id := auth.uid();
    IF voter_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required for voting';
    END IF;
    NEW.user_id := voter_id;
  END IF;

  -- Fetch battle context
  SELECT 
    ab.status, 
    ab.end_voting_at,
    s1.user_id as player1_id,
    s2.user_id as player2_id
  INTO battle_record
  FROM public.active_battles ab
  LEFT JOIN public.submissions s1 ON ab.player1_submission_id = s1.id
  LEFT JOIN public.submissions s2 ON ab.player2_submission_id = s2.id
  WHERE ab.id = NEW.battle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;

  IF battle_record.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Voting is not allowed for this battle status: %', battle_record.status;
  END IF;

  IF NOW() > battle_record.end_voting_at THEN
    RAISE EXCEPTION 'Voting period has ended';
  END IF;

  IF voter_id = battle_record.player1_id OR voter_id = battle_record.player2_id THEN
    RAISE EXCEPTION 'Cannot vote on your own battle';
  END IF;

  IF NEW.vote NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid vote value: %', NEW.vote;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Update apply_supertip_vote to set the bypass flag around the insert
CREATE OR REPLACE FUNCTION public.apply_supertip_vote(
  p_sender_user_id uuid,
  p_battle_id uuid,
  p_vote character,
  p_comment text,
  p_super_tip_amount integer,
  p_payment_intent_id text,
  p_super_tip_id uuid
)
RETURNS json
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

  SELECT id INTO v_current_season_id
  FROM public.seasons 
  WHERE status = 'active' AND start_at <= now() AND end_at >= now()
  ORDER BY start_at DESC
  LIMIT 1;
  v_season_found := v_current_season_id IS NOT NULL;

  SELECT * INTO v_existing
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = p_sender_user_id;

  IF NOT FOUND THEN
    -- Set bypass so trigger won't require auth.uid() and won't overwrite NEW.user_id
    PERFORM set_config('app.bypass_vote_auth', 'true', true);

    INSERT INTO public.battle_votes (
      battle_id, user_id, vote, comment,
      super_tip_amount, stripe_payment_intent_id, payment_status,
      season_id, is_super_tip_vote, super_tip_id
    ) VALUES (
      p_battle_id, p_sender_user_id, p_vote, COALESCE(p_comment, ''),
      GREATEST(p_super_tip_amount, 0), p_payment_intent_id, 'succeeded',
      v_current_season_id, true, p_super_tip_id
    );

    -- Reset bypass flag locally
    PERFORM set_config('app.bypass_vote_auth', 'false', true);

    IF p_vote = 'A' THEN
      UPDATE public.active_battles SET votes_a = votes_a + 1 WHERE id = p_battle_id;
    ELSE
      UPDATE public.active_battles SET votes_b = votes_b + 1 WHERE id = p_battle_id;
    END IF;

    UPDATE public.profiles
    SET 
      vote_count = COALESCE(vote_count, 0) + 3,
      season_vote_points = COALESCE(season_vote_points, 0) + CASE WHEN v_season_found THEN 3 ELSE 0 END,
      updated_at = NOW()
    WHERE id = p_sender_user_id;

    v_is_new := true;
  ELSE
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

COMMIT;
