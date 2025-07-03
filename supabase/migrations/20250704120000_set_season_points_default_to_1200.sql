-- Set the default value for season_points to 1200 for new users
ALTER TABLE public.profiles
ALTER COLUMN season_points SET DEFAULT 1200;

-- Update existing users whose season_points is 0 to the new default of 1200
UPDATE public.profiles
SET season_points = 1200
WHERE season_points = 0;

COMMENT ON COLUMN public.profiles.season_points IS 'シーズン専用ポイント。初期値は1200。'; 