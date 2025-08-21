-- 本番環境: ad_placements テーブル構造を開発環境に合わせる
-- 日時: 2025-08-21
-- 目的: 本番環境でフォールバック広告が表示される問題の修正（テーブル構造統一）

-- 1. 開発環境にある is_active カラムを追加
ALTER TABLE ad_placements ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. 開発環境にある size カラムを追加
ALTER TABLE ad_placements ADD COLUMN IF NOT EXISTS size text;

-- 3. 既存データのis_activeカラムを有効に設定
UPDATE ad_placements SET is_active = true WHERE is_active IS NULL;

-- 4. 確認: テーブル構造が揃ったかチェック
-- 最終的な構造: id, key, description, created_at, updated_at, is_active, size
