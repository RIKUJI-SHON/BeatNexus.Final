/*
  # Create archived_battle_votes table for BeatNexus

  1. New table `archived_battle_votes`
    - `id` (uuid, primary key)
    - `archived_battle_id` (references archived_battles.id)
    - `user_id` (nullable - references profiles.id)
    - `vote` ('A' for player1, 'B' for player2)
    - `comment` (text, nullable)
    - `created_at` (timestamp)

  2. Security and constraints
    - Enable RLS on table
    - Public can read archived battle votes
    - Only authenticated users can insert/update/delete (server-side)
    - One vote per user per archived battle
*/

-- Create archived_battle_votes table
CREATE TABLE IF NOT EXISTS public.archived_battle_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_battle_id UUID NOT NULL REFERENCES public.archived_battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  vote CHAR(1) NOT NULL CHECK (vote IN ('A', 'B')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One vote per user per archived battle (allows NULL user_id for anonymous votes)
  UNIQUE(archived_battle_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.archived_battle_votes ENABLE ROW LEVEL SECURITY;

-- Policies for archived_battle_votes table
-- Public can view all archived battle votes (for transparency)
CREATE POLICY "Public can view archived battle votes"
  ON public.archived_battle_votes
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- System can insert archived battle votes (during archival process)
CREATE POLICY "System can insert archived battle votes"
  ON public.archived_battle_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System can update archived battle votes (if needed for corrections)
CREATE POLICY "System can update archived battle votes"
  ON public.archived_battle_votes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- System can delete archived battle votes (if needed for data cleanup)
CREATE POLICY "System can delete archived battle votes"
  ON public.archived_battle_votes
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_archived_battle_votes_archived_battle_id ON public.archived_battle_votes(archived_battle_id);
CREATE INDEX idx_archived_battle_votes_user_id ON public.archived_battle_votes(user_id);
CREATE INDEX idx_archived_battle_votes_created_at ON public.archived_battle_votes(created_at);

-- Add comment for documentation
COMMENT ON TABLE public.archived_battle_votes IS 'Stores votes and comments from archived battles to preserve them after active battles are deleted';
COMMENT ON COLUMN public.archived_battle_votes.archived_battle_id IS 'Reference to the archived battle this vote belongs to';
COMMENT ON COLUMN public.archived_battle_votes.user_id IS 'User who made this vote, NULL for anonymous votes';
COMMENT ON COLUMN public.archived_battle_votes.vote IS 'Vote choice: A for player1, B for player2';
COMMENT ON COLUMN public.archived_battle_votes.comment IS 'Optional comment left with the vote'; 