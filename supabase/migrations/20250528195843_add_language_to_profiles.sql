-- supabase/migrations/20250528195843_add_language_to_profiles.sql
ALTER TABLE public.profiles
ADD COLUMN language VARCHAR(2) DEFAULT 'ja' NOT NULL;

COMMENT ON COLUMN public.profiles.language IS 'User language preference (e.g., ja, en)';

-- Update existing users to have a default language if they don't have one (optional, but good practice)
UPDATE public.profiles
SET language = 'ja'
WHERE language IS NULL; 