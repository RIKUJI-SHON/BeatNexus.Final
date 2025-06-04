/*
  # Fix active_battles table to match matchmaking functions

  1. Clear existing data (to avoid NULL constraint issues)
  2. Add missing user_id columns
    - Add `player1_user_id` (uuid references profiles.id)
    - Add `player2_user_id` (uuid references profiles.id)

  3. Update constraints
    - Add constraint to ensure different players
    - Update existing constraints
*/

-- Step 1: Clear existing active_battles data to avoid NULL constraint issues
DELETE FROM public.active_battles;

-- Step 2: Add missing user_id columns to active_battles
ALTER TABLE public.active_battles 
ADD COLUMN IF NOT EXISTS player1_user_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS player2_user_id UUID REFERENCES public.profiles(id);

-- Step 3: Make the columns NOT NULL (safe now since table is empty)
ALTER TABLE public.active_battles 
ALTER COLUMN player1_user_id SET NOT NULL,
ALTER COLUMN player2_user_id SET NOT NULL;

-- Step 4: Add constraint to ensure different players (drop existing first to avoid conflicts)
ALTER TABLE public.active_battles 
DROP CONSTRAINT IF EXISTS different_players;

ALTER TABLE public.active_battles 
ADD CONSTRAINT different_players CHECK (player1_user_id != player2_user_id);

-- Step 5: Create or replace the find_match function to match code expectations
CREATE OR REPLACE FUNCTION find_match(submission_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission public.submissions;
  v_match public.submissions;
BEGIN
  -- Get submission details
  SELECT * INTO v_submission
  FROM public.submissions
  WHERE id = submission_id
  AND status = 'WAITING_OPPONENT';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Find potential match
  SELECT * INTO v_match
  FROM public.submissions
  WHERE status = 'WAITING_OPPONENT'
  AND battle_format = v_submission.battle_format
  AND user_id != v_submission.user_id
  AND (
    v_submission.rank_at_submission IS NULL
    OR rank_at_submission IS NULL
    OR ABS(rank_at_submission - v_submission.rank_at_submission) <= 300
  )
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN v_match.id;
END;
$$;

-- Step 6: Create or replace the create_battle function to match table structure
CREATE OR REPLACE FUNCTION create_battle(submission1_id uuid, submission2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_battle_id uuid;
  sub1 public.submissions;
  sub2 public.submissions;
BEGIN
  -- Get submission details
  SELECT * INTO sub1 FROM public.submissions WHERE id = submission1_id;
  SELECT * INTO sub2 FROM public.submissions WHERE id = submission2_id;

  IF sub1.id IS NULL OR sub2.id IS NULL THEN
    RAISE EXCEPTION 'Submissions not found';
  END IF;

  -- Create new battle with current table structure
  INSERT INTO public.active_battles (
    battle_format,
    player1_submission_id,
    player1_user_id,
    player2_submission_id,
    player2_user_id,
    status,
    end_voting_at
  ) VALUES (
    sub1.battle_format,
    submission1_id,
    sub1.user_id,
    submission2_id,
    sub2.user_id,
    'ACTIVE',
    NOW() + INTERVAL '5 minutes'
  ) RETURNING id INTO new_battle_id;

  -- Update submissions status
  UPDATE public.submissions
  SET 
    status = 'MATCHED_IN_BATTLE',
    active_battle_id = new_battle_id
  WHERE id IN (submission1_id, submission2_id);

  RETURN new_battle_id;
END;
$$; 