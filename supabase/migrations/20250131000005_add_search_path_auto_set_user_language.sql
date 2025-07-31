-- auto_set_user_language関数にsearch_pathを追加
-- 2025-01-31

CREATE OR REPLACE FUNCTION auto_set_user_language()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
BEGIN
  -- 新規作成時にlanguageがNULLの場合、デフォルトで英語を設定
  IF NEW.language IS NULL THEN
    NEW.language := 'en';
  END IF;
  
  RETURN NEW;
END;
$$;
