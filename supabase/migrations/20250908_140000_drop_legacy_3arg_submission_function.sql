-- Migration: Drop legacy 3-arg create_submission_with_cooldown_check to enforce 4-arg Stream-enabled version
-- Rationale: Avoid PostgREST overload ambiguity causing p_stream_video_id to be ignored.
-- Safe: Wrapped in conditional block; does nothing if 3-arg version already absent.
-- Date: 2025-09-08

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.proname='create_submission_with_cooldown_check'
      AND pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid, p_video_url text, p_battle_format text'
  ) THEN
    RAISE NOTICE 'Dropping legacy 3-arg create_submission_with_cooldown_check(uuid,text,text)';
    EXECUTE 'DROP FUNCTION public.create_submission_with_cooldown_check(uuid, text, text)';
  ELSE
    RAISE NOTICE 'Legacy 3-arg function already absent';
  END IF;
END $$;

-- Verification suggestion (manual):
-- SELECT proname, pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--  WHERE proname='create_submission_with_cooldown_check' AND n.nspname='public';
