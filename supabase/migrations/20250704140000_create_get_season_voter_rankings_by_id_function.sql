-- supabase/migrations/20250704140000_create_get_season_voter_rankings_by_id_function.sql

-- Drop the function if it exists, to handle cases where the return type might have changed.
DROP FUNCTION IF EXISTS public.get_season_voter_rankings_by_id(uuid);

-- Create the function with the correct definition.
CREATE OR REPLACE FUNCTION public.get_season_voter_rankings_by_id(p_season_id uuid)
RETURNS TABLE(rank bigint, user_id uuid, username text, avatar_url text, votes integer, season_id uuid)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        svr.rank::bigint,
        svr.user_id,
        p.username,
        p.avatar_url,
        svr.votes,
        svr.season_id
    FROM
        public.season_voter_rankings AS svr
    JOIN
        public.profiles AS p ON svr.user_id = p.id
    WHERE
        svr.season_id = p_season_id
    ORDER BY
        svr.rank ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_season_voter_rankings_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_season_voter_rankings_by_id(uuid) TO service_role; 