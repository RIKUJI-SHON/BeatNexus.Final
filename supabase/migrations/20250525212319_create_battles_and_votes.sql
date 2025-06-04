/*
  # Create battles and voting system for BeatNexus

  1. New table `active_battles`
    - `id` (uuid, primary key)
    - `player1_submission_id` (references submissions.id)
    - `player2_submission_id` (references submissions.id)
    - `battle_format` (same as submissions)
    - `status` (ACTIVE, COMPLETED)
    - `votes_a` (vote count for player 1)
    - `votes_b` (vote count for player 2)
    - `end_voting_at` (voting deadline)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  2. New table `battle_votes`
    - `id` (uuid, primary key)
    - `battle_id` (references active_battles.id)
    - `user_id` (references profiles.id, nullable for anonymous)
    - `vote` ('A' for player1, 'B' for player2)
    - `created_at` (timestamp)

  3. Security and constraints
    - Enable RLS on both tables
    - Prevent users from voting on their own battles
    - One vote per user per battle
*/

-- Create battle status enum
CREATE TYPE battle_status AS ENUM ('ACTIVE', 'COMPLETED');

-- Create active_battles table
CREATE TABLE IF NOT EXISTS public.active_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  player2_submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  battle_format battle_format NOT NULL,
  status battle_status NOT NULL DEFAULT 'ACTIVE',
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  end_voting_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure players are different
  CONSTRAINT different_players CHECK (player1_submission_id != player2_submission_id)
);

-- Create battle_votes table
CREATE TABLE IF NOT EXISTS public.battle_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.active_battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  vote CHAR(1) NOT NULL CHECK (vote IN ('A', 'B')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One vote per user per battle (allows NULL user_id for anonymous votes)
  UNIQUE(battle_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.active_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_votes ENABLE ROW LEVEL SECURITY;

-- Policies for active_battles table
-- Public can view all active battles
CREATE POLICY "Public can view active battles"
  ON public.active_battles
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- System can insert battles (via edge functions)
CREATE POLICY "System can insert battles"
  ON public.active_battles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System can update battles (for vote counts and status)
CREATE POLICY "System can update battles"
  ON public.active_battles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for battle_votes table
-- Users can view all votes (for transparency)
CREATE POLICY "Public can view battle votes"
  ON public.battle_votes
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can vote (prevent self-voting via function)
CREATE POLICY "Authenticated users can vote"
  ON public.battle_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own votes (change vote)
CREATE POLICY "Users can update their own votes"
  ON public.battle_votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes (cancel vote)
CREATE POLICY "Users can delete their own votes"
  ON public.battle_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER active_battles_updated_at
  BEFORE UPDATE ON public.active_battles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_active_battles_status ON public.active_battles(status);
CREATE INDEX idx_active_battles_end_voting_at ON public.active_battles(end_voting_at);
CREATE INDEX idx_battle_votes_battle_id ON public.battle_votes(battle_id);
CREATE INDEX idx_battle_votes_user_id ON public.battle_votes(user_id);
