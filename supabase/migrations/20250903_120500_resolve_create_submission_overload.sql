-- Resolve ambiguity for create_submission_with_cooldown_check RPC
-- Drop the text-typed 4-arg overload to avoid PostgREST function selection error
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_submission_with_cooldown_check'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid, text, text, text'
  ) THEN
    EXECUTE 'DROP FUNCTION public.create_submission_with_cooldown_check(uuid, text, text, text)';
  END IF;
END $$;
