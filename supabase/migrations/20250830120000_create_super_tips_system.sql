-- Super Tips schema and policies (supports standalone tips and destination charges)

-- 1. profiles table extension (Stripe Connect)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  stripe_connect_account_id text UNIQUE,
  stripe_charges_enabled boolean DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect 
  ON profiles(stripe_connect_account_id) 
  WHERE stripe_connect_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_charges_enabled 
  ON profiles(stripe_charges_enabled) WHERE stripe_charges_enabled = true;

-- 2. super_tips table (battle_id/vote nullable to allow standalone support)
CREATE TABLE IF NOT EXISTS public.super_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  battle_id uuid REFERENCES active_battles(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Voting
  vote char(1) CHECK (vote IN ('A', 'B')),
  comment text NOT NULL CHECK (LENGTH(TRIM(comment)) > 0 AND LENGTH(comment) <= 500),
  
  -- Amount (JPY)
  amount_jpy integer NOT NULL CHECK (amount_jpy >= 100 AND amount_jpy <= 10000),
  
  -- Stripe
  stripe_payment_intent_id text UNIQUE NOT NULL,
  stripe_transfer_id text,
  stripe_connect_account_id text NOT NULL,
  
  -- Status
  payment_status text NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  transfer_status text DEFAULT 'pending'
    CHECK (transfer_status IN ('pending', 'paid', 'canceled')),
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  
  -- Constraints (limit 1 tip per user per battle only when battle is present)
  CONSTRAINT super_tips_sender_battle_unique UNIQUE (sender_user_id, battle_id) DEFERRABLE INITIALLY IMMEDIATE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_super_tips_battle_id ON super_tips(battle_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_sender ON super_tips(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_recipient ON super_tips(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_status ON super_tips(payment_status, transfer_status);
CREATE INDEX IF NOT EXISTS idx_super_tips_created_at ON super_tips(created_at);
CREATE INDEX IF NOT EXISTS idx_super_tips_stripe_payment ON super_tips(stripe_payment_intent_id);

-- Helper constraint (if battle is null then vote must be null)
ALTER TABLE public.super_tips
  ADD CONSTRAINT IF NOT EXISTS super_tips_vote_null_when_no_battle
  CHECK (battle_id IS NOT NULL OR vote IS NULL);

-- Partial unique index (only enforce uniqueness when battle_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS ux_super_tips_sender_battle
  ON super_tips(sender_user_id, battle_id) WHERE battle_id IS NOT NULL;

-- 3. battle_votes extension
ALTER TABLE public.battle_votes ADD COLUMN IF NOT EXISTS
  super_tip_id uuid REFERENCES super_tips(id) ON DELETE SET NULL,
  is_super_tip_vote boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_battle_votes_super_tip 
  ON battle_votes(super_tip_id) WHERE super_tip_id IS NOT NULL;

-- 4. RLS
ALTER TABLE super_tips ENABLE ROW LEVEL SECURITY;

-- SELECT policy (optimized auth.uid())
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'super_tips' AND policyname = 'Users can view relevant super tips'
  ) THEN
    CREATE POLICY "Users can view relevant super tips" ON super_tips
      FOR SELECT USING (
        (select auth.uid()) = sender_user_id OR 
        (select auth.uid()) = recipient_user_id OR
        EXISTS (
          SELECT 1 FROM active_battles 
          WHERE active_battles.id = super_tips.battle_id 
          AND ((select auth.uid()) = active_battles.player1_user_id OR (select auth.uid()) = active_battles.player2_user_id)
        )
      );
  END IF;
END$$;

-- INSERT policy (optimized auth.uid())
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'super_tips' AND policyname = 'Authenticated users can create super tips'
  ) THEN
    CREATE POLICY "Authenticated users can create super tips" ON super_tips
      FOR INSERT WITH CHECK ((select auth.uid()) = sender_user_id);
  END IF;
END$$;

-- UPDATE policy (system)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'super_tips' AND policyname = 'System can update super tips'
  ) THEN
    CREATE POLICY "System can update super tips" ON super_tips
      FOR UPDATE USING (true);
  END IF;
END$$;

-- 5. trigger for updated_at
CREATE OR REPLACE FUNCTION update_super_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_super_tips_updated_at_trigger ON super_tips;
CREATE TRIGGER update_super_tips_updated_at_trigger
  BEFORE UPDATE ON super_tips
  FOR EACH ROW EXECUTE FUNCTION update_super_tips_updated_at();

-- 6. season points integration function
CREATE OR REPLACE FUNCTION update_super_tip_vote_points(
  p_user_id uuid,
  p_season_id uuid,
  p_season_found boolean
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_vote_count_increment INTEGER := 3;
  v_season_vote_points_increment INTEGER := 0;
BEGIN
  IF p_season_found AND p_season_id IS NOT NULL THEN
    v_season_vote_points_increment := 3;
    
    UPDATE public.profiles
    SET 
      vote_count = vote_count + v_vote_count_increment,
      season_vote_points = COALESCE(season_vote_points, 0) + v_season_vote_points_increment,
      updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET 
      vote_count = vote_count + v_vote_count_increment,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object(
    'vote_count_added', v_vote_count_increment,
    'season_vote_points_added', v_season_vote_points_increment,
    'season_found', p_season_found
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_super_tip_vote_points TO authenticated;
