-- ☎️ 電話番号認証機能: プロファイルテーブル拡張
-- 作成日: 2025-07-03
-- 目的: 新規ユーザーの電話番号必須認証に対応

-- Step 1: プロファイルテーブルに電話番号関連カラムを追加
ALTER TABLE profiles 
  ADD COLUMN phone_number varchar UNIQUE,
  ADD COLUMN phone_verified boolean DEFAULT false;

-- Step 2: インデックス追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON profiles(phone_verified);

-- Step 3: RLS (Row Level Security) ポリシー更新
-- 電話番号は本人のみ読み書き可能
CREATE POLICY "Users can read own phone number" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own phone number" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Step 4: コメント追加（ドキュメント化）
COMMENT ON COLUMN profiles.phone_number IS '電話番号（国際フォーマット例: +81-90-1234-5678）';
COMMENT ON COLUMN profiles.phone_verified IS '電話番号認証完了フラグ（新規ユーザーはtrue、既存ユーザーはfalse）';

-- Step 5: 既存ユーザーへの影響確認
-- 既存ユーザーの phone_verified は false のまま（サービス利用に影響なし）
-- 新規ユーザーは電話番号認証後に phone_verified = true になる 