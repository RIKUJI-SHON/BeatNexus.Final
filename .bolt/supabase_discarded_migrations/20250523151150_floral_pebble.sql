/*
  # Battle Matchmaking System Tables

  1. New Tables
    - `submissions`
      - Stores individual video submissions before matching
      - Tracks submission status and battle association
    - `active_battles`
      - Stores matched battles between submissions
      - Handles voting and results

  2. Security
    - Enable RLS on both tables
    - Add policies for submission management
    - Add policies for battle viewing and voting
*/

-- Create submissions table
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  video_url text NOT NULL,
  battle_format text NOT NULL CHECK (battle_format IN ('MAIN_BATTLE', 'MINI_BATTLE', 'THEME_CHALLENGE')),
  status text NOT NULL DEFAULT 'WAITING_OPPONENT' 
    CHECK (status IN ('WAITING_OPPONENT', 'MATCHED_IN_BATTLE', 'BATTLE_ENDED', 'WITHDRAWN')),
  rank_at_submission integer,
  active_battle_id uuid,
  
  -- Create indexes for efficient querying
  CONSTRAINT fk_active_battle FOREIGN KEY (active_battle_id) 
    REFERENCES active_battles(id) ON DELETE SET NULL
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_battle_format ON submissions(battle_format);
CREATE INDEX idx_submissions_status ON submissions(status);

-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for submissions
CREATE POLICY "Users can insert their own submissions"
  ON submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own submissions"
  ON submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their waiting submissions"
  ON submissions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND 
    status = 'WAITING_OPPONENT'
  )
  WITH CHECK (
    auth.uid() = user_id AND 
    status = 'WAITING_OPPONENT'
  );

-- Create active_battles table
CREATE TABLE active_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  battle_format text NOT NULL,
  player1_submission_id uuid REFERENCES submissions(id) NOT NULL,
  player1_user_id uuid REFERENCES auth.users(id) NOT NULL,
  player2_submission_id uuid REFERENCES submissions(id) NOT NULL,
  player2_user_id uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'VOTING_OPEN'
    CHECK (status IN ('VOTING_OPEN', 'VOTING_CLOSED', 'RESULT_ANNOUNCED', 'ARCHIVED')),
  voting_ends_at timestamptz,
  winner_user_id uuid REFERENCES auth.users(id),
  player1_votes integer DEFAULT 0,
  player2_votes integer DEFAULT 0,
  
  -- Ensure different players
  CONSTRAINT different_players CHECK (player1_user_id != player2_user_id),
  -- Ensure different submissions
  CONSTRAINT different_submissions CHECK (player1_submission_id != player2_submission_id)
);

-- Enable RLS
ALTER TABLE active_battles ENABLE ROW LEVEL SECURITY;

-- Create policies for active_battles
CREATE POLICY "Authenticated users can view active battles"
  ON active_battles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to find match for a submission
CREATE OR REPLACE FUNCTION find_match(submission_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission submissions;
  v_match submissions;
BEGIN
  -- Get submission details
  SELECT * INTO v_submission
  FROM submissions
  WHERE id = submission_id
  AND status = 'WAITING_OPPONENT';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Find potential match
  SELECT * INTO v_match
  FROM submissions
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

-- Create function to create battle from matched submissions
CREATE OR REPLACE FUNCTION create_battle(submission1_id uuid, submission2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_battle_id uuid;
  v_submission1 submissions;
  v_submission2 submissions;
BEGIN
  -- Get submission details
  SELECT * INTO v_submission1 FROM submissions WHERE id = submission1_id;
  SELECT * INTO v_submission2 FROM submissions WHERE id = submission2_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submissions not found';
  END IF;

  -- Create battle
  INSERT INTO active_battles (
    battle_format,
    player1_submission_id,
    player1_user_id,
    player2_submission_id,
    player2_user_id,
    voting_ends_at
  ) VALUES (
    v_submission1.battle_format,
    submission1_id,
    v_submission1.user_id,
    submission2_id,
    v_submission2.user_id,
    now() + interval '7 days'
  ) RETURNING id INTO v_battle_id;

  -- Update submissions
  UPDATE submissions
  SET 
    status = 'MATCHED_IN_BATTLE',
    active_battle_id = v_battle_id
  WHERE id IN (submission1_id, submission2_id);

  RETURN v_battle_id;
END;
$$;