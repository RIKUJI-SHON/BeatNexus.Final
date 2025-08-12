-- 新規ユーザーの言語設定を適切に初期化する
-- handle_new_user関数を安定した以前のバージョンに戻す
-- 
-- 問題: 複雑な入力検証とエラーハンドリングが原因で新規アカウント作成に失敗
-- 解決: シンプルで安定した以前のバージョンに戻す

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 現在の複雑な関数を削除
DROP FUNCTION IF EXISTS public.handle_new_user();

-- シンプルで安定したhandle_new_user関数を再作成
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

-- トリガーを再作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- profilesテーブルのlanguage列のデフォルト値を設定
ALTER TABLE public.profiles 
ALTER COLUMN language SET DEFAULT 'ja';

-- 既存のユーザーでlanguage列がNULLの場合は日本語に設定
UPDATE public.profiles 
SET language = 'ja' 
WHERE language IS NULL;

-- マイグレーション完了確認
DO $$
BEGIN
  RAISE NOTICE '=== handle_new_user関数修正完了 ===';
  RAISE NOTICE '✅ 複雑な入力検証を削除';
  RAISE NOTICE '✅ シンプルで安定した実装に戻す';
  RAISE NOTICE '✅ 新規アカウント作成エラー修正';
  RAISE NOTICE '=======================================';
END $$;
