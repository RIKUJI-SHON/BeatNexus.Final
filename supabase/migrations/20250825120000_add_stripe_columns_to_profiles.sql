-- Add Stripe Connect columns to profiles table
-- Migration: add_stripe_columns_to_profiles
-- Date: 2025-08-25

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean DEFAULT false;

-- Add comments to describe the columns
COMMENT ON COLUMN public.profiles.stripe_account_id IS 'Stripe Connect account ID for receiving SuperTips';
COMMENT ON COLUMN public.profiles.stripe_charges_enabled IS 'Whether the Stripe account can receive charges (completed onboarding)';

-- Add index for better performance when querying by stripe_account_id
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON public.profiles(stripe_account_id);
