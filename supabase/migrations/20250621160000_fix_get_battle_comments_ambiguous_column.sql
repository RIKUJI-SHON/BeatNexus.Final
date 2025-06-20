/*
  # Fix ambiguous column reference in get_battle_comments function

  Fix the error: column reference "id" is ambiguous by using proper table aliases.
*/

-- Drop and recreate get_battle_comments() function with proper table aliases
DROP FUNCTION IF EXISTS public.get_battle_comments(uuid);

CREATE FUNCTION public.get_battle_comments(p_battle_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  vote character(1),
  comment text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_active_battle boolean := false;
  v_is_archived_battle boolean := false;
BEGIN
  -- Check if this is an active battle
  SELECT EXISTS(
    SELECT 1 FROM public.active_battles ab WHERE ab.id = p_battle_id
  ) INTO v_is_active_battle;

  IF v_is_active_battle THEN
    -- Return comments from active battle (existing logic)
    RETURN QUERY
    SELECT 
      bv.id,
      bv.user_id,
      COALESCE(p.username, 'Anonymous') as username,
      p.avatar_url,
      bv.vote,
      bv.comment,
      bv.created_at
    FROM public.battle_votes bv
    LEFT JOIN public.profiles p ON bv.user_id = p.id
    WHERE bv.battle_id = p_battle_id 
      AND bv.comment IS NOT NULL 
      AND bv.comment != ''
      AND (p.is_deleted IS NULL OR p.is_deleted = false)
    ORDER BY bv.created_at DESC;

  ELSE
    -- Check if this is an archived battle (by archived_battle.id)
    SELECT EXISTS(
      SELECT 1 FROM public.archived_battles ab WHERE ab.id = p_battle_id
    ) INTO v_is_archived_battle;

    IF v_is_archived_battle THEN
      -- Return comments from archived battle
      RETURN QUERY
      SELECT 
        abv.id,
        abv.user_id,
        COALESCE(p.username, 'Anonymous') as username,
        p.avatar_url,
        abv.vote,
        abv.comment,
        abv.created_at
      FROM public.archived_battle_votes abv
      LEFT JOIN public.profiles p ON abv.user_id = p.id
      WHERE abv.archived_battle_id = p_battle_id 
        AND abv.comment IS NOT NULL 
        AND abv.comment != ''
        AND (p.is_deleted IS NULL OR p.is_deleted = false)
      ORDER BY abv.created_at DESC;

    ELSE
      -- Also check if this is an original_battle_id from archived_battles
      -- This handles cases where frontend passes the original active battle ID
      RETURN QUERY
      SELECT 
        abv.id,
        abv.user_id,
        COALESCE(p.username, 'Anonymous') as username,
        p.avatar_url,
        abv.vote,
        abv.comment,
        abv.created_at
      FROM public.archived_battle_votes abv
      LEFT JOIN public.profiles p ON abv.user_id = p.id
      JOIN public.archived_battles ab ON abv.archived_battle_id = ab.id
      WHERE ab.original_battle_id = p_battle_id 
        AND abv.comment IS NOT NULL 
        AND abv.comment != ''
        AND (p.is_deleted IS NULL OR p.is_deleted = false)
      ORDER BY abv.created_at DESC;
    END IF;
  END IF;

  RETURN;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_battle_comments(uuid) TO authenticated, anon;

-- Add comment to document this update
COMMENT ON FUNCTION public.get_battle_comments(uuid) IS 'Retrieves battle comments for both active battles (from battle_votes) and archived battles (from archived_battle_votes). Supports both archived_battle.id and original_battle_id as input. Fixed ambiguous column references.'; 