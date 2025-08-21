-- 本番環境：基本的な広告システム基盤を作成
-- スクリプト名: 20250821_create_simple_ad_system_production
-- 作成日: 2025-01-21

-- 1. 広告主テーブル
CREATE TABLE IF NOT EXISTS advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website_url text,
  contact_email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 広告配置テーブル
CREATE TABLE IF NOT EXISTS ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. シンプル広告テーブル（コンテンツと契約期間）
CREATE TABLE IF NOT EXISTS simple_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES advertisers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  click_url text NOT NULL,
  contract_start_date date NOT NULL,
  contract_end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. 配置割り当てテーブル
CREATE TABLE IF NOT EXISTS ad_placement_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid REFERENCES ad_placements(id) ON DELETE CASCADE,
  simple_ad_id uuid REFERENCES simple_ads(id) ON DELETE CASCADE,
  priority integer DEFAULT 100,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(placement_id, simple_ad_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ad_placements_key ON ad_placements(key);
CREATE INDEX IF NOT EXISTS idx_simple_ads_active_dates ON simple_ads(is_active, contract_start_date, contract_end_date);
CREATE INDEX IF NOT EXISTS idx_ad_placement_assignments_placement ON ad_placement_assignments(placement_id, priority, is_pinned);

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_advertisers_updated_at BEFORE UPDATE ON advertisers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ad_placements_updated_at BEFORE UPDATE ON ad_placements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_simple_ads_updated_at BEFORE UPDATE ON simple_ads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
