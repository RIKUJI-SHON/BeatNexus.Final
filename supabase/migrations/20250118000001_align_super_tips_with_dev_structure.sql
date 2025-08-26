-- SuperTip テーブル構造を開発環境に合わせるマイグレーション
-- 作成日: 2025-01-18
-- 目的: 本番環境の super_tips テーブルを開発環境の構造に統一する

BEGIN;

-- ===============================================
-- 1. 既存データの一時保存
-- ===============================================

-- 既存のsuper_tipsデータをバックアップテーブルに保存
CREATE TABLE IF NOT EXISTS super_tips_backup AS 
SELECT * FROM super_tips;

-- ===============================================
-- 2. 新しいsuper_tipsテーブルの作成
-- ===============================================

-- 既存テーブルを削除（制約エラー回避のため）
DROP TABLE IF EXISTS super_tips CASCADE;

-- 開発環境と同じ構造でsuper_tipsテーブルを再作成
CREATE TABLE super_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ユーザー関連（開発環境の命名に統一）
  voter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  supported_player_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- バトル関連（分離された設計に変更）
  active_battle_id UUID REFERENCES active_battles(id) ON DELETE CASCADE,
  archived_battle_id UUID REFERENCES archived_battles(id) ON DELETE CASCADE,
  
  -- 金額情報（開発環境の命名に統一）
  amount_jpy INTEGER NOT NULL CHECK (amount_jpy >= 100),
  
  -- 決済情報（開発環境の構造に統一）
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_account_id TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  
  -- メタデータ（開発環境と同様）
  metadata JSONB DEFAULT '{}',
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 制約: アクティブまたはアーカイブバトルのどちらか一つのみ
  CONSTRAINT check_battle_reference CHECK (
    (active_battle_id IS NOT NULL AND archived_battle_id IS NULL) OR
    (active_battle_id IS NULL AND archived_battle_id IS NOT NULL)
  )
);

-- ===============================================
-- 3. データの移行
-- ===============================================

-- バックアップデータから新しいテーブルにデータを移行
INSERT INTO super_tips (
  id,
  voter_user_id,
  supported_player_user_id,
  active_battle_id,
  amount_jpy,
  stripe_payment_intent_id,
  stripe_account_id,
  payment_status,
  metadata,
  created_at,
  updated_at
)
SELECT 
  id,
  -- sender_id を voter_user_id としてマッピング（auth.users経由で解決が必要な場合）
  (SELECT auth_id FROM profiles WHERE id = sender_id LIMIT 1) as voter_user_id,
  recipient_id as supported_player_user_id,
  battle_id as active_battle_id,
  amount as amount_jpy,
  stripe_payment_intent_id,
  -- stripe_account_idは受取者のprofilesから取得
  COALESCE(
    (SELECT stripe_account_id FROM profiles WHERE id = recipient_id LIMIT 1),
    'missing_stripe_account'
  ) as stripe_account_id,
  -- statusをpayment_statusにマッピング
  CASE 
    WHEN status = 'completed' THEN 'succeeded'
    WHEN status = 'cancelled' THEN 'canceled'
    ELSE status
  END as payment_status,
  '{}' as metadata,
  created_at,
  updated_at
FROM super_tips_backup;

-- ===============================================
-- 4. battle_votes テーブルの制約統一
-- ===============================================

-- battle_votesテーブルの制約を開発環境に合わせる
ALTER TABLE battle_votes 
ALTER COLUMN super_tip_amount DROP DEFAULT,
ADD CONSTRAINT check_super_tip_amount 
  CHECK (super_tip_amount IS NULL OR super_tip_amount >= 100);

-- payment_statusの制約が既に正しいことを確認
-- （両環境で同じため変更不要）

-- ===============================================
-- 5. archived_battle_votes テーブルの統一
-- ===============================================

-- has_super_tip カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'archived_battle_votes' 
    AND column_name = 'has_super_tip'
  ) THEN
    ALTER TABLE archived_battle_votes 
    ADD COLUMN has_super_tip BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- archived_battle_votesの制約を開発環境に合わせる
ALTER TABLE archived_battle_votes 
ALTER COLUMN super_tip_amount DROP DEFAULT,
ADD CONSTRAINT check_archived_super_tip_amount 
  CHECK (super_tip_amount IS NULL OR super_tip_amount >= 100);

-- payment_statusの制約を更新
ALTER TABLE archived_battle_votes DROP CONSTRAINT IF EXISTS archived_battle_votes_payment_status_check;
ALTER TABLE archived_battle_votes 
ADD CONSTRAINT archived_battle_votes_payment_status_check 
  CHECK (payment_status IS NULL OR payment_status IN ('pending', 'succeeded', 'failed', 'canceled'));

-- ===============================================
-- 6. インデックスの作成
-- ===============================================

-- パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_super_tips_voter_user_id ON super_tips(voter_user_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_supported_player_user_id ON super_tips(supported_player_user_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_active_battle_id ON super_tips(active_battle_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_archived_battle_id ON super_tips(archived_battle_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_payment_status ON super_tips(payment_status);
CREATE INDEX IF NOT EXISTS idx_super_tips_created_at ON super_tips(created_at);

-- ===============================================
-- 7. RLS (Row Level Security) の設定
-- ===============================================

-- RLSを有効化（開発環境と同様）
ALTER TABLE super_tips ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシーを作成
CREATE POLICY "SuperTips are viewable by authenticated users" ON super_tips
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create their own SuperTips" ON super_tips
  FOR INSERT WITH CHECK (auth.uid() = voter_user_id);

CREATE POLICY "Users can update their own SuperTips" ON super_tips
  FOR UPDATE USING (auth.uid() = voter_user_id);

-- ===============================================
-- 8. 統計とクリーンアップ
-- ===============================================

-- 移行統計の表示
DO $$ 
DECLARE
  original_count INTEGER;
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM super_tips_backup;
  SELECT COUNT(*) INTO migrated_count FROM super_tips;
  
  RAISE NOTICE 'Migration completed: % records in backup, % records migrated', 
    original_count, migrated_count;
END $$;

-- バックアップテーブルの保持（安全のため、手動削除推奨）
-- DROP TABLE super_tips_backup; -- 手動で確認後に削除

COMMIT;

-- ===============================================
-- マイグレーション完了メッセージ
-- ===============================================
-- このマイグレーションにより、本番環境のsuper_tipsテーブルが
-- 開発環境と同じ構造に統一されました。
-- 
-- 主な変更点:
-- 1. カラム名の統一 (sender_id → voter_user_id, etc.)
-- 2. バトル参照の分離 (active_battle_id / archived_battle_id)
-- 3. 制約とデフォルト値の統一
-- 4. 開発環境と同じRLSポリシーの適用
-- 
-- 注意: super_tips_backup テーブルは安全のため保持しています。
-- 動作確認後に手動で削除してください。
