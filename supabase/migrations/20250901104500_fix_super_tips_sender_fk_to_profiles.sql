-- Fix FK: super_tips.sender_user_id should reference public.profiles(id) for PostgREST relationship
-- Reason: Frontend selects profiles:sender_user_id(...), but current FK points to auth.users(id), causing 400 PGRST200

BEGIN;

-- Drop existing FK to auth.users if present
ALTER TABLE public.super_tips
  DROP CONSTRAINT IF EXISTS super_tips_voter_user_id_fkey;

-- Recreate FK to profiles(id)
ALTER TABLE public.super_tips
  ADD CONSTRAINT fk_super_tips_sender_profile
  FOREIGN KEY (sender_user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Optional: ensure helpful comment for maintainers
COMMENT ON CONSTRAINT fk_super_tips_sender_profile ON public.super_tips IS
  'FK for PostgREST relationship: super_tips.sender_user_id -> profiles.id (used by select profiles:sender_user_id)';

COMMIT;
