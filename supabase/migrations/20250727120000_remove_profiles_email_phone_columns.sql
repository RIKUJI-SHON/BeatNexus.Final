-- profilesテーブルからemail、phone_number、phone_verifiedカラムを削除
-- 開発環境の構造に統一するためのマイグレーション

-- まず、emailカラムに依存するインデックスがあるかチェック（安全措置）
DO $$
BEGIN
  -- email カラムに関連するインデックスを削除（存在する場合）
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_email_idx') THEN
    DROP INDEX IF EXISTS profiles_email_idx;
    RAISE NOTICE 'Dropped index: profiles_email_idx';
  END IF;

  -- phone_number カラムに関連するインデックスを削除（存在する場合）
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_phone_number') THEN
    DROP INDEX IF EXISTS idx_profiles_phone_number;
    RAISE NOTICE 'Dropped index: idx_profiles_phone_number';
  END IF;

  -- phone_verified カラムに関連するインデックスを削除（存在する場合）
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_phone_verified') THEN
    DROP INDEX IF EXISTS idx_profiles_phone_verified;
    RAISE NOTICE 'Dropped index: idx_profiles_phone_verified';
  END IF;
END $$;

-- カラム削除前にデータをバックアップ（ログとして記録）
DO $$
DECLARE
  email_count INTEGER;
  phone_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO email_count FROM profiles WHERE email IS NOT NULL;
  SELECT COUNT(*) INTO phone_count FROM profiles WHERE phone_number IS NOT NULL;
  
  RAISE NOTICE 'Migration backup info: % profiles with email, % profiles with phone_number', email_count, phone_count;
END $$;

-- emailカラムを削除
ALTER TABLE profiles DROP COLUMN IF EXISTS email;

-- phone_numberカラムを削除
ALTER TABLE profiles DROP COLUMN IF EXISTS phone_number;

-- phone_verifiedカラムを削除（存在する場合）
ALTER TABLE profiles DROP COLUMN IF EXISTS phone_verified;

-- 変更完了のログ
DO $$
BEGIN
  RAISE NOTICE 'Successfully removed email, phone_number, and phone_verified columns from profiles table';
  RAISE NOTICE 'Profiles table structure is now unified with development environment';
END $$;
