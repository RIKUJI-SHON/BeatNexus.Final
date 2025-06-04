-- Create archived_battles table
CREATE TABLE archived_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  end_voting_at timestamptz NOT NULL,
  contestant_a_id uuid REFERENCES profiles(id) NOT NULL,
  contestant_b_id uuid REFERENCES profiles(id) NOT NULL,
  votes_a integer DEFAULT 0,
  votes_b integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  
  -- Ensure contestants are different users
  CONSTRAINT different_contestants CHECK (contestant_a_id != contestant_b_id)
);

-- Enable RLS
ALTER TABLE archived_battles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read archived_battles"
  ON archived_battles
  FOR SELECT
  USING (true);

-- Create votes table to track who voted
CREATE TABLE battle_votes (
  battle_id uuid REFERENCES archived_battles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  vote text CHECK (vote IN ('A', 'B')),
  created_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (battle_id, user_id)
);

-- Enable RLS on votes
ALTER TABLE battle_votes ENABLE ROW LEVEL SECURITY;

-- Policies for votes
CREATE POLICY "Users can see their own votes"
  ON battle_votes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to vote on a battle
CREATE OR REPLACE FUNCTION vote_battle(p_battle_id uuid, p_vote text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if battle exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM archived_battles 
    WHERE id = p_battle_id 
    AND status = 'active'
    AND end_voting_at > now()
  ) THEN
    RAISE EXCEPTION 'Battle not found or not active';
  END IF;

  -- Check if user has already voted
  IF EXISTS (
    SELECT 1 FROM battle_votes
    WHERE battle_id = p_battle_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already voted';
  END IF;

  -- Record the vote
  INSERT INTO battle_votes (battle_id, user_id, vote)
  VALUES (p_battle_id, auth.uid(), p_vote);

  -- Update vote counts
  UPDATE archived_battles
  SET 
    votes_a = CASE WHEN p_vote = 'A' THEN votes_a + 1 ELSE votes_a END,
    votes_b = CASE WHEN p_vote = 'B' THEN votes_b + 1 ELSE votes_b END
  WHERE id = p_battle_id;
END;
$$;

-- Create view for rankings
CREATE VIEW rankings_view AS
SELECT
  p.id as user_id,
  p.username,
  p.avatar_url,
  p.level,
  p.xp,
  COALESCE(
    (SELECT COUNT(*) FROM archived_battles b
    WHERE (b.contestant_a_id = p.id AND b.votes_a > b.votes_b)
    OR (b.contestant_b_id = p.id AND b.votes_b > b.votes_a)
    AND b.status = 'completed'), 0
  ) as battles_won,
  COALESCE(
    (SELECT COUNT(*) FROM archived_battles b
    WHERE (b.contestant_a_id = p.id AND b.votes_a < b.votes_b)
    OR (b.contestant_b_id = p.id AND b.votes_b < b.votes_a)
    AND b.status = 'completed'), 0
  ) as battles_lost,
  COALESCE(
    (SELECT SUM(
      CASE 
        WHEN b.contestant_a_id = p.id AND b.votes_a > b.votes_b THEN 100
        WHEN b.contestant_b_id = p.id AND b.votes_b > b.votes_a THEN 100
        ELSE 0
      END
    ) FROM archived_battles b
    WHERE (b.contestant_a_id = p.id OR b.contestant_b_id = p.id)
    AND b.status = 'completed'), 0
  ) as season_points
FROM profiles p;