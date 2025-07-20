-- 新規ユーザーの言語設定を適切に初期化する
-- handle_new_user関数を更新して、ブラウザ言語を考慮した設定を行う

-- まず、profilesテーブルのlanguage列のデフォルト値を設定
ALTER TABLE public.profiles 
ALTER COLUMN language SET DEFAULT 'ja';

-- handle_new_user関数を更新
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  detected_language VARCHAR(2) DEFAULT 'ja';
BEGIN
  -- ユーザーのメタデータから言語設定を取得を試行
  -- フロントエンドから言語情報が渡される場合に備える
  IF NEW.raw_user_meta_data ? 'language' THEN
    detected_language := COALESCE(NEW.raw_user_meta_data->>'language', 'ja');
    -- 有効な言語コードかチェック
    IF detected_language NOT IN ('ja', 'en') THEN
      detected_language := 'ja';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, username, email, avatar_url, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    NEW.email,
    '/images/FI.png',  -- デフォルトアバター
    detected_language  -- 検出された言語またはデフォルト（日本語）
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 既存のユーザーでlanguage列がNULLの場合は日本語に設定
UPDATE public.profiles 
SET language = 'ja' 
WHERE language IS NULL;
