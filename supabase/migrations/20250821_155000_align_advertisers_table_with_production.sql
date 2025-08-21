-- 開発環境のadvertisersテーブルを本番環境の構造に合わせる
-- 実行日: 2025-08-21
-- 目的: advertisersテーブルの構造を本番環境と完全に一致させる

-- まず、新しいカラムを追加
ALTER TABLE advertisers 
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 既存のcontact_info JSONBから情報を抽出して新しいカラムに移行
UPDATE advertisers 
SET 
  website_url = COALESCE(contact_info->>'website_url', contact_info->>'website'),
  contact_email = COALESCE(contact_info->>'contact_email', contact_info->>'email')
WHERE contact_info IS NOT NULL;

-- 古いカラムを削除
ALTER TABLE advertisers 
DROP COLUMN IF EXISTS contact_info,
DROP COLUMN IF EXISTS billing_info;

-- nameカラムにUNIQUE制約を追加（本番環境に合わせる）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'advertisers_name_key' 
    AND table_name = 'advertisers'
  ) THEN
    ALTER TABLE advertisers ADD CONSTRAINT advertisers_name_key UNIQUE (name);
  END IF;
END $$;

-- 最終的なテーブル構造確認のためのコメント
COMMENT ON TABLE advertisers IS 'Advertisers table - aligned with production structure (2025-08-21)';
COMMENT ON COLUMN advertisers.website_url IS 'Company website URL';
COMMENT ON COLUMN advertisers.contact_email IS 'Primary contact email address';
COMMENT ON COLUMN advertisers.is_active IS 'Active status flag for advertiser account';
