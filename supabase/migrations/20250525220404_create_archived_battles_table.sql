/*
  # Create archived_battles table for BeatNexus

  1. New table `archived_battles`
    - `id` (uuid, primary key)
    - `original_battle_id` (references active_battles.id)
    - `winner_id` (nullable - references profiles.id)
    - `final_votes_a` (final vote count for player 1)
    - `final_votes_b` (final vote count for player 2)
    - `archived_at` (timestamp when battle was archived)
    - `battle_format` (MAIN_BATTLE, MINI_BATTLE, THEME_BATTLE)
    - `player1_user_id` (references profiles.id)
    - `player2_user_id` (references profiles.id)
    - `player1_submission_id` (references submissions.id)
    - `player2_submission_id` (references submissions.id)

  2. Security
    - Enable RLS on `archived_battles` table
    - Users can view archived battles they participated in
    - Public can view completed archived battles
*/

-- Create archived_battles table
CREATE TABLE IF NOT EXISTS public.archived_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_battle_id UUID NOT NULL REFERENCES public.active_battles(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  final_votes_a INTEGER NOT NULL DEFAULT 0,
  final_votes_b INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  battle_format battle_format NOT NULL,
  player1_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player1_submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  player2_submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure players are different
  CONSTRAINT different_players_archived CHECK (player1_user_id != player2_user_id),
  -- Ensure winner is one of the players (if not null)
  CONSTRAINT valid_winner CHECK (winner_id IS NULL OR winner_id = player1_user_id OR winner_id = player2_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.archived_battles ENABLE ROW LEVEL SECURITY;

-- Policies for archived_battles table
-- Public can view all archived battles
CREATE POLICY "Public can view archived battles"
  ON public.archived_battles
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- System can insert archived battles (when battles are completed)
CREATE POLICY "System can insert archived battles"
  ON public.archived_battles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System can update archived battles
CREATE POLICY "System can update archived battles"
  ON public.archived_battles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER archived_battles_updated_at
  BEFORE UPDATE ON public.archived_battles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_archived_battles_player1_user_id ON public.archived_battles(player1_user_id);
CREATE INDEX idx_archived_battles_player2_user_id ON public.archived_battles(player2_user_id);
CREATE INDEX idx_archived_battles_winner_id ON public.archived_battles(winner_id);
CREATE INDEX idx_archived_battles_original_battle_id ON public.archived_battles(original_battle_id);
CREATE INDEX idx_archived_battles_archived_at ON public.archived_battles(archived_at);

-- Create function to archive a completed battle
CREATE OR REPLACE FUNCTION public.archive_battle(
  p_battle_id UUID
) RETURNS UUID AS $$
DECLARE
  v_battle RECORD;
  v_winner_id UUID;
  v_archived_battle_id UUID;
BEGIN
  -- Get the battle details
  SELECT * INTO v_battle
  FROM public.active_battles
  WHERE id = p_battle_id AND status = 'COMPLETED';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found or not completed';
  END IF;
  
  -- Determine winner
  IF v_battle.votes_a > v_battle.votes_b THEN
    v_winner_id := v_battle.player1_submission_id; -- Get user_id from submission
    SELECT user_id INTO v_winner_id FROM public.submissions WHERE id = v_battle.player1_submission_id;
  ELSIF v_battle.votes_b > v_battle.votes_a THEN
    v_winner_id := v_battle.player2_submission_id; -- Get user_id from submission
    SELECT user_id INTO v_winner_id FROM public.submissions WHERE id = v_battle.player2_submission_id;
  ELSE
    v_winner_id := NULL; -- Draw
  END IF;
  
  -- Get player user IDs from submissions
  DECLARE
    v_player1_user_id UUID;
    v_player2_user_id UUID;
  BEGIN
    SELECT user_id INTO v_player1_user_id FROM public.submissions WHERE id = v_battle.player1_submission_id;
    SELECT user_id INTO v_player2_user_id FROM public.submissions WHERE id = v_battle.player2_submission_id;
    
    -- Insert into archived_battles
    INSERT INTO public.archived_battles (
      original_battle_id,
      winner_id,
      final_votes_a,
      final_votes_b,
      battle_format,
      player1_user_id,
      player2_user_id,
      player1_submission_id,
      player2_submission_id
    ) VALUES (
      p_battle_id,
      v_winner_id,
      v_battle.votes_a,
      v_battle.votes_b,
      v_battle.battle_format,
      v_player1_user_id,
      v_player2_user_id,
      v_battle.player1_submission_id,
      v_battle.player2_submission_id
    ) RETURNING id INTO v_archived_battle_id;
    
    RETURN v_archived_battle_id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
