-- Create a SECURITY DEFINER function to fetch a user's earned rewards for public viewing
-- This bypasses RLS on user_rewards while returning only safe fields
-- Note: Keep search_path to public and grant execute to anon/authenticated

CREATE OR REPLACE FUNCTION public.get_public_user_rewards(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  reward_id uuid,
  earned_at timestamptz,
  earned_season_id uuid,
  reward jsonb
) AS $$
  SELECT
    ur.id,
    ur.user_id,
    ur.reward_id,
    ur.earned_at,
    ur.earned_season_id,
    to_jsonb(r) AS reward
  FROM public.user_rewards ur
  JOIN public.rewards r ON r.id = ur.reward_id
  WHERE ur.user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Ensure only execute is granted; table data privileges remain protected by RLS
REVOKE ALL ON FUNCTION public.get_public_user_rewards(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_user_rewards(uuid) TO anon, authenticated;
