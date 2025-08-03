-- 本番環境のprofilesテーブル構造を開発環境と同じにする
-- 不足しているカラムを追加: email, phone_number, phone_verified

-- 1. emailカラムを追加（NOT NULL制約付き）
-- 既存レコードには auth.users.email からデータを移行
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 既存レコードのemailカラムにauth.usersからデータを移行
UPDATE public.profiles 
SET email = auth_users.email 
FROM auth.users auth_users 
WHERE profiles.id = auth_users.id 
AND profiles.email IS NULL;

-- emailカラムにNOT NULL制約を追加
ALTER TABLE public.profiles 
ALTER COLUMN email SET NOT NULL;

-- 2. phone_numberカラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number CHARACTER VARYING;

-- 3. phone_verifiedカラムを追加（デフォルト値：false）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- 4. created_atとupdated_atのNULL制約を調整（開発環境に合わせる）
-- 開発環境: created_at, updated_at は nullable
-- 本番環境: created_at, updated_at は not null
-- 開発環境に合わせてnullableに変更
ALTER TABLE public.profiles 
ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE public.profiles 
ALTER COLUMN updated_at DROP NOT NULL;

-- 5. テーブル構造の検証
DO $$
DECLARE
  column_count INTEGER;
  email_exists BOOLEAN;
  phone_number_exists BOOLEAN;  
  phone_verified_exists BOOLEAN;
BEGIN
  -- emailカラムの存在確認
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND table_schema = 'public' 
    AND column_name = 'email'
  ) INTO email_exists;
  
  -- phone_numberカラムの存在確認
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND table_schema = 'public' 
    AND column_name = 'phone_number'
  ) INTO phone_number_exists;
  
  -- phone_verifiedカラムの存在確認
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND table_schema = 'public' 
    AND column_name = 'phone_verified'
  ) INTO phone_verified_exists;
  
  -- 全カラム数の確認
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND table_schema = 'public';
  
  IF NOT email_exists THEN
    RAISE EXCEPTION 'email column was not added successfully';
  END IF;
  
  IF NOT phone_number_exists THEN
    RAISE EXCEPTION 'phone_number column was not added successfully';
  END IF;
  
  IF NOT phone_verified_exists THEN
    RAISE EXCEPTION 'phone_verified column was not added successfully';
  END IF;
  
  -- 開発環境と同じ18カラムになっているか確認
  IF column_count != 18 THEN
    RAISE EXCEPTION 'profiles table column count mismatch. Expected: 18, Actual: %', column_count;
  END IF;
  
  RAISE NOTICE 'profiles table structure synchronized successfully. Total columns: %', column_count;
  RAISE NOTICE 'Added columns: email (NOT NULL), phone_number (nullable), phone_verified (boolean, default false)';
END $$;
