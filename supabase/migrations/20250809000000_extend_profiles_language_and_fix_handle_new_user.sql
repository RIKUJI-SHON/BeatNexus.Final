-- Extend supported languages and unify handle_new_user to be email-independent with safe language handling
-- Apply first to dev (wdttluticnlqzmqmfvgt), verify, then to prod (qgqcjtjxaoplhxurbpis)

BEGIN;

-- 1) Ensure profiles.language column exists; set DEFAULT 'en' and update CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'language'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN language TEXT;
  END IF;
END $$;

-- Drop old constraint if any and recreate with extended list
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_language_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_language_check;
  END IF;
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_language_check CHECK (language IN ('en','ja','ko','zh-CN','es','pt-BR','fr','de'));
END $$;

-- Set default to 'en'
ALTER TABLE public.profiles ALTER COLUMN language SET DEFAULT 'en';

-- Cleanup existing values (NULL or not in allowed list)
UPDATE public.profiles 
SET language = 'en'
WHERE language IS NULL OR language NOT IN ('en','ja','ko','zh-CN','es','pt-BR','fr','de');

-- 2) Replace handle_new_user to remove email dependency and set language safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  generated_username TEXT;
  username_exists BOOLEAN;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 10;
  detected_language TEXT := 'en';
BEGIN
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  -- Language detection from metadata with whitelist
  IF NEW.raw_user_meta_data ? 'language' THEN
    detected_language := COALESCE(NEW.raw_user_meta_data->>'language', 'en');
  END IF;
  detected_language := LOWER(detected_language);
  IF detected_language ~ '^zh' THEN
    detected_language := 'zh-CN';
  ELSIF detected_language ~ '^pt' THEN
    detected_language := 'pt-BR';
  ELSIF detected_language NOT IN ('en','ja','ko','zh-CN','es','pt-BR','fr','de') THEN
    detected_language := 'en';
  END IF;

  -- Username generation/validation
  generated_username := COALESCE(NEW.raw_user_meta_data->>'username', NULL);

  IF generated_username IS NULL OR generated_username = '' THEN
    LOOP
      generated_username := 'user_' || LOWER(SUBSTRING(encode(gen_random_bytes(8), 'hex'), 1, 12));
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = generated_username) INTO username_exists;
      EXIT WHEN NOT username_exists;
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique username after % attempts', max_attempts;
      END IF;
    END LOOP;
  ELSE
    IF LENGTH(generated_username) < 3 OR LENGTH(generated_username) > 30 THEN
      RAISE EXCEPTION 'Username must be between 3 and 30 characters';
    END IF;
    IF generated_username !~ '^[a-zA-Z0-9_-]+$' THEN
      RAISE EXCEPTION 'Username contains invalid characters';
    END IF;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = generated_username) INTO username_exists;
    IF username_exists THEN
      RAISE EXCEPTION 'Username already exists: %', generated_username;
    END IF;
  END IF;

  -- Insert profile (email column no longer referenced)
  INSERT INTO public.profiles (id, username, language, created_at, updated_at)
  VALUES (NEW.id, generated_username, detected_language, NOW(), NOW());

  RAISE LOG 'New user profile created: % (%) language=%', generated_username, NEW.id, detected_language;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'User profile creation failed for %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

COMMIT;
