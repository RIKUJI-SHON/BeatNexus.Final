-- Drift-aware migration to align existing dev schema to Super Tips v1.1

-- profiles: add stripe_connect_account_id and backfill from legacy stripe_account_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON public.profiles(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_account_id'
  ) THEN
    UPDATE public.profiles
    SET stripe_connect_account_id = COALESCE(stripe_connect_account_id, stripe_account_id)
    WHERE stripe_connect_account_id IS NULL;
  END IF;
END$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_charges_enabled ON public.profiles(stripe_charges_enabled) WHERE stripe_charges_enabled = true;

-- super_tips: rename legacy columns if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='super_tips' AND column_name='voter_user_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='super_tips' AND column_name='sender_user_id') THEN
    ALTER TABLE public.super_tips RENAME COLUMN voter_user_id TO sender_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='super_tips' AND column_name='supported_player_user_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='super_tips' AND column_name='recipient_user_id') THEN
    ALTER TABLE public.super_tips RENAME COLUMN supported_player_user_id TO recipient_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='super_tips' AND column_name='active_battle_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='super_tips' AND column_name='battle_id') THEN
    ALTER TABLE public.super_tips RENAME COLUMN active_battle_id TO battle_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='super_tips' AND column_name='stripe_account_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='super_tips' AND column_name='stripe_connect_account_id') THEN
    ALTER TABLE public.super_tips RENAME COLUMN stripe_account_id TO stripe_connect_account_id;
  END IF;
END$$;

-- super_tips: add new columns if missing
ALTER TABLE public.super_tips ADD COLUMN IF NOT EXISTS vote char(1) CHECK (vote IN ('A','B'));
ALTER TABLE public.super_tips ADD COLUMN IF NOT EXISTS comment text;
ALTER TABLE public.super_tips ADD COLUMN IF NOT EXISTS stripe_transfer_id text;
ALTER TABLE public.super_tips ADD COLUMN IF NOT EXISTS transfer_status text DEFAULT 'pending' CHECK (transfer_status IN ('pending','paid','canceled'));
ALTER TABLE public.super_tips ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- super_tips: ensure non-empty comment moving forward; backfill minimal text for existing NULLs
UPDATE public.super_tips SET comment = COALESCE(NULLIF(TRIM(comment), ''), 'Imported from legacy') WHERE comment IS NULL OR TRIM(comment) = '';
ALTER TABLE public.super_tips ALTER COLUMN comment SET NOT NULL;
ALTER TABLE public.super_tips ADD CONSTRAINT super_tips_comment_len CHECK (LENGTH(TRIM(comment)) > 0 AND LENGTH(comment) <= 500) NOT VALID;

-- super_tips: helper constraint and partial unique index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'super_tips_vote_null_when_no_battle'
  ) THEN
    ALTER TABLE public.super_tips
      ADD CONSTRAINT super_tips_vote_null_when_no_battle CHECK (battle_id IS NOT NULL OR vote IS NULL) NOT VALID;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_super_tips_sender_battle ON public.super_tips(sender_user_id, battle_id) WHERE battle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_super_tips_battle_id ON public.super_tips(battle_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_sender ON public.super_tips(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_recipient ON public.super_tips(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_status ON public.super_tips(payment_status, transfer_status);
CREATE INDEX IF NOT EXISTS idx_super_tips_created_at ON public.super_tips(created_at);
CREATE INDEX IF NOT EXISTS idx_super_tips_stripe_payment ON public.super_tips(stripe_payment_intent_id);

-- Foreign key to active_battles for battle_id if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema='public' AND tc.table_name='super_tips' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='battle_id'
  ) THEN
    ALTER TABLE public.super_tips
      ADD CONSTRAINT super_tips_battle_fk FOREIGN KEY (battle_id) REFERENCES public.active_battles(id) ON DELETE CASCADE NOT VALID;
  END IF;
END$$;

-- RLS: ensure policies exist
ALTER TABLE public.super_tips ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'super_tips' AND policyname = 'Users can view relevant super tips'
  ) THEN
    CREATE POLICY "Users can view relevant super tips" ON public.super_tips
      FOR SELECT USING (
        (select auth.uid()) = sender_user_id OR 
        (select auth.uid()) = recipient_user_id OR
        EXISTS (
          SELECT 1 FROM public.active_battles 
          WHERE active_battles.id = super_tips.battle_id 
          AND ((select auth.uid()) = active_battles.player1_user_id OR (select auth.uid()) = active_battles.player2_user_id)
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'super_tips' AND policyname = 'Authenticated users can create super tips'
  ) THEN
    CREATE POLICY "Authenticated users can create super tips" ON public.super_tips
      FOR INSERT WITH CHECK ((select auth.uid()) = sender_user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'super_tips' AND policyname = 'System can update super tips'
  ) THEN
    CREATE POLICY "System can update super tips" ON public.super_tips
      FOR UPDATE USING (true);
  END IF;
END$$;

-- trigger function and trigger
CREATE OR REPLACE FUNCTION update_super_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_super_tips_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_super_tips_updated_at_trigger
      BEFORE UPDATE ON public.super_tips
      FOR EACH ROW EXECUTE FUNCTION update_super_tips_updated_at();
  END IF;
END$$;

-- battle_votes: add linkage columns if missing
ALTER TABLE public.battle_votes ADD COLUMN IF NOT EXISTS super_tip_id uuid REFERENCES public.super_tips(id) ON DELETE SET NULL;
ALTER TABLE public.battle_votes ADD COLUMN IF NOT EXISTS is_super_tip_vote boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_battle_votes_super_tip ON public.battle_votes(super_tip_id) WHERE super_tip_id IS NOT NULL;
