-- 言語設定のデフォルト値を英語に変更
-- 開発環境・本番環境の両方で適用

-- profilesテーブルのlanguage列のデフォルト値を英語に変更
ALTER TABLE public.profiles 
ALTER COLUMN language SET DEFAULT 'en';

-- 既存のユーザーでlanguage列が日本語デフォルトの場合も英語に更新
-- ただし、明示的に日本語を選択したユーザーは除外（created_atが古い場合のみ）
UPDATE public.profiles 
SET 
  language = 'en',
  updated_at = NOW()
WHERE 
  language = 'ja' 
  AND created_at >= '2025-07-29'::date; -- 今日以降の新規ユーザーのみ

-- ログ出力
DO $$ 
BEGIN
  RAISE NOTICE 'Language default changed from ja to en';
  RAISE NOTICE 'Updated recent users (created after 2025-07-29) from ja to en';
END $$;
