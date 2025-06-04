-- Update voting interval for matchmaking to 5 minutes
CREATE OR REPLACE FUNCTION public.find_match_and_create_battle(p_submission_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission submissions;
  v_opponent submissions;
  v_battle_id UUID;
  v_voting_end_time TIMESTAMPTZ;
BEGIN
  -- Get the submission details
  SELECT * INTO v_submission
  FROM public.submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Submission not found'
    );
  END IF;

  -- Only process if submission is waiting for opponent
  IF v_submission.status != 'WAITING_OPPONENT' THEN
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Submission is not waiting for opponent',
      'current_status', v_submission.status
    );
  END IF;

  -- Find an opponent
  SELECT * INTO v_opponent
  FROM public.submissions
  WHERE battle_format = v_submission.battle_format
    AND status = 'WAITING_OPPONENT'
    AND user_id != v_submission.user_id
    AND id != p_submission_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'battle_created', false,
      'message', 'No opponent found, submission waiting',
      'waiting', true
    );
  END IF;

  -- Set voting end time to 5 minutes from now
  v_voting_end_time := NOW() + INTERVAL '5 minutes';

  -- Create the battle record
  INSERT INTO public.active_battles (
    player1_submission_id,
    player2_submission_id,
    player1_user_id,
    player2_user_id,
    battle_format,
    status,
    votes_a,
    votes_b,
    end_voting_at,
    created_at
  ) VALUES (
    v_submission.id,
    v_opponent.id,
    v_submission.user_id,
    v_opponent.user_id,
    v_submission.battle_format,
    'ACTIVE',
    0,
    0,
    v_voting_end_time,
    NOW()
  ) RETURNING id INTO v_battle_id;

  -- Update submissions to matched
  UPDATE public.submissions
  SET
    status = 'MATCHED_IN_BATTLE',
    active_battle_id = v_battle_id,
    updated_at = NOW()
  WHERE id IN (v_submission.id, v_opponent.id);

  -- Return success
  RETURN json_build_object(
    'battle_created', true,
    'battle_id', v_battle_id,
    'opponent_id', v_opponent.user_id,
    'voting_ends_at', v_voting_end_time,
    'message', 'Battle created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Database error occurred',
      'error_details', SQLERRM
    );
END;
$$; 