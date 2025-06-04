/*
  # Add user_id columns to active_battles table

  1. Add player1_user_id and player2_user_id columns
  2. These are needed by the matchmaking functions
*/

-- Add user_id columns to active_battles table
ALTER TABLE public.active_battles 
ADD COLUMN IF NOT EXISTS player1_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS player2_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_active_battles_player1_user_id ON public.active_battles(player1_user_id);
CREATE INDEX IF NOT EXISTS idx_active_battles_player2_user_id ON public.active_battles(player2_user_id); 