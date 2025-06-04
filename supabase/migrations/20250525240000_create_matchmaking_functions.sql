/*
  # Create matchmaking functions

  1. find_match_and_create_battle function
    - Find a waiting opponent with same battle format
    - Create a new battle if match found
    - Update submission statuses

  2. Helper functions for battle management
*/

-- Function to find match and create battle
CREATE OR REPLACE FUNCTION find_match_and_create_battle(p_submission_id UUID)
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
  FROM submissions
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

  -- Find an opponent with same battle format (exclude same user)
  SELECT * INTO v_opponent
  FROM submissions
  WHERE battle_format = v_submission.battle_format
    AND status = 'WAITING_OPPONENT'
    AND user_id != v_submission.user_id
    AND id != p_submission_id
  ORDER BY created_at ASC  -- First come, first served
  LIMIT 1;

  -- If no opponent found, submission stays waiting
  IF NOT FOUND THEN
    RETURN json_build_object(
      'battle_created', false,
      'message', 'No opponent found, submission waiting',
      'waiting', true
    );
  END IF;

  -- Calculate voting end time (7 days from now)
  v_voting_end_time := NOW() + INTERVAL '7 days';

  -- Create the battle
  INSERT INTO active_battles (
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

  -- Update both submissions to matched status
  UPDATE submissions 
  SET 
    status = 'MATCHED_IN_BATTLE',
    active_battle_id = v_battle_id,
    updated_at = NOW()
  WHERE id IN (v_submission.id, v_opponent.id);

  -- Return success result
  RETURN json_build_object(
    'battle_created', true,
    'battle_id', v_battle_id,
    'opponent_id', v_opponent.user_id,
    'voting_ends_at', v_voting_end_time,
    'message', 'Battle created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Database error occurred',
      'error_details', SQLERRM
    );
END;
$$;

-- Function to manually trigger battle completion (for testing)
CREATE OR REPLACE FUNCTION complete_battle(p_battle_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_battle active_battles;
  v_winner_id UUID;
  v_archived_id UUID;
BEGIN
  -- Get battle details
  SELECT * INTO v_battle
  FROM active_battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found'
    );
  END IF;

  -- Determine winner (or null for tie)
  IF v_battle.votes_a > v_battle.votes_b THEN
    v_winner_id := v_battle.player1_user_id;
  ELSIF v_battle.votes_b > v_battle.votes_a THEN
    v_winner_id := v_battle.player2_user_id;
  ELSE
    v_winner_id := NULL; -- Tie
  END IF;

  -- Archive the battle
  INSERT INTO archived_battles (
    original_battle_id,
    winner_id,
    final_votes_a,
    final_votes_b,
    battle_format,
    player1_user_id,
    player2_user_id,
    player1_submission_id,
    player2_submission_id,
    archived_at
  ) VALUES (
    v_battle.id,
    v_winner_id,
    v_battle.votes_a,
    v_battle.votes_b,
    v_battle.battle_format,
    v_battle.player1_user_id,
    v_battle.player2_user_id,
    v_battle.player1_submission_id,
    v_battle.player2_submission_id,
    NOW()
  ) RETURNING id INTO v_archived_id;

  -- Update submissions status
  UPDATE submissions
  SET 
    status = 'BATTLE_ENDED',
    updated_at = NOW()
  WHERE id IN (v_battle.player1_submission_id, v_battle.player2_submission_id);

  -- Delete from active battles
  DELETE FROM active_battles WHERE id = p_battle_id;

  RETURN json_build_object(
    'success', true,
    'archived_battle_id', v_archived_id,
    'winner_id', v_winner_id,
    'final_votes_a', v_battle.votes_a,
    'final_votes_b', v_battle.votes_b
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to complete battle',
      'error_details', SQLERRM
    );
END;
$$; 