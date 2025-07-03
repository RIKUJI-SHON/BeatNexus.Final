-- 20250705170000_fix_get_all_seasons_function.sql
-- get_all_seasons関数の戻り値の型と実際のクエリを一致させる修正

CREATE OR REPLACE FUNCTION public.get_all_seasons()
RETURNS TABLE(
  id uuid, 
  name text, 
  start_at timestamp with time zone, 
  end_at timestamp with time zone, 
  status text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.start_at,
    s.end_at,
    s.status,
    s.created_at,
    s.updated_at
  FROM seasons s
  ORDER BY s.start_at DESC; -- 新しいシーズンから順に
END;
$$;

COMMENT ON FUNCTION public.get_all_seasons() IS 'シーズン一覧を取得する関数（新しい順）'; 