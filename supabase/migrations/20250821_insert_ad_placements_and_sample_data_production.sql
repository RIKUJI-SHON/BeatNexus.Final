-- 本番環境：広告配置とサンプルデータを挿入
-- スクリプト名: 20250821_insert_ad_placements_and_sample_data_production
-- 作成日: 2025-01-21

-- 基本的な広告配置を挿入（本番環境）
INSERT INTO ad_placements (key, description) VALUES
  ('banner-top', 'サイト上部バナー広告'),
  ('banner-bottom', 'サイト下部バナー広告'),
  ('after-3', 'バトルリスト3番目の後'),
  ('after-6', 'バトルリスト6番目の後'),
  ('after-9', 'バトルリスト9番目の後'),
  ('after-10', 'バトルリスト10番目の後'),
  ('after-12', 'バトルリスト12番目の後'),
  ('after-15', 'バトルリスト15番目の後'),
  ('after-18', 'バトルリスト18番目の後'),
  ('after-21', 'バトルリスト21番目の後'),
  ('after-24', 'バトルリスト24番目の後'),
  ('after-27', 'バトルリスト27番目の後'),
  ('after-30', 'バトルリスト30番目の後'),
  ('carousel-slide-3', 'ニュースカルーセル3番目のスライド'),
  ('sidebar-top', 'サイドバー上部'),
  ('sidebar-middle', 'サイドバー中部'),
  ('sidebar-bottom', 'サイドバー下部')
ON CONFLICT (key) DO NOTHING;

-- サンプル広告主
INSERT INTO advertisers (name, website_url, contact_email, is_active) VALUES
  ('TechStartup Co.', 'https://techstartup.example.com', 'ads@techstartup.example.com', true),
  ('Music Gear Store', 'https://musicgear.example.com', 'marketing@musicgear.example.com', true),
  ('Creative Agency', 'https://creative.example.com', 'info@creative.example.com', true)
ON CONFLICT DO NOTHING;

-- サンプル広告（現在の日付から30日間有効）
DO $$
DECLARE
    advertiser1_id uuid;
    advertiser2_id uuid;
    advertiser3_id uuid;
    ad1_id uuid;
    ad2_id uuid;
    ad3_id uuid;
    ad4_id uuid;
    ad5_id uuid;
BEGIN
    -- 広告主IDを取得
    SELECT id INTO advertiser1_id FROM advertisers WHERE name = 'TechStartup Co.' LIMIT 1;
    SELECT id INTO advertiser2_id FROM advertisers WHERE name = 'Music Gear Store' LIMIT 1;
    SELECT id INTO advertiser3_id FROM advertisers WHERE name = 'Creative Agency' LIMIT 1;

    -- 広告を個別に挿入
    INSERT INTO simple_ads (advertiser_id, title, description, image_url, click_url, contract_start_date, contract_end_date, is_active) 
    VALUES (advertiser1_id, '最新のAI開発ツール', 'プロダクト開発を加速する革新的なAIツールセット', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=800&fit=crop', 'https://techstartup.example.com/ai-tools', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true)
    RETURNING id INTO ad1_id;

    INSERT INTO simple_ads (advertiser_id, title, description, image_url, click_url, contract_start_date, contract_end_date, is_active) 
    VALUES (advertiser2_id, 'プロ仕様の音楽機材', '音楽制作のクオリティを向上させる高品質機材', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop', 'https://musicgear.example.com/pro-equipment', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true)
    RETURNING id INTO ad2_id;

    INSERT INTO simple_ads (advertiser_id, title, description, image_url, click_url, contract_start_date, contract_end_date, is_active) 
    VALUES (advertiser3_id, 'クリエイティブサービス', 'ブランドの価値を最大化するデザインソリューション', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop', 'https://creative.example.com/services', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true)
    RETURNING id INTO ad3_id;

    INSERT INTO simple_ads (advertiser_id, title, description, image_url, click_url, contract_start_date, contract_end_date, is_active) 
    VALUES (advertiser1_id, 'カルーセル用AI画像', 'AI技術による画像生成サービス', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=800&fit=crop', 'https://techstartup.example.com/ai-image', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true)
    RETURNING id INTO ad4_id;

    INSERT INTO simple_ads (advertiser_id, title, description, image_url, click_url, contract_start_date, contract_end_date, is_active) 
    VALUES (advertiser2_id, 'カルーセル用音楽画像', 'プロフェッショナル音楽スタジオ', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=800&fit=crop', 'https://musicgear.example.com/studio', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true)
    RETURNING id INTO ad5_id;

    -- 配置割り当て（ローテーション）
    INSERT INTO ad_placement_assignments (placement_id, simple_ad_id, priority, is_pinned) 
    SELECT p.id, a.id, 
           CASE WHEN row_number() OVER (PARTITION BY p.id ORDER BY a.id) = 1 THEN 1 ELSE 100 END as priority,
           false
    FROM ad_placements p
    CROSS JOIN simple_ads a
    WHERE p.key IN ('after-3', 'after-6', 'after-9', 'after-10', 'after-12', 'after-15', 'after-18', 'after-21', 'after-24', 'after-27', 'after-30', 'banner-top', 'banner-bottom', 'sidebar-top', 'sidebar-middle', 'sidebar-bottom')
    AND a.is_active = true;

    -- カルーセル専用割り当て（カルーセル用画像を優先）
    INSERT INTO ad_placement_assignments (placement_id, simple_ad_id, priority, is_pinned)
    SELECT p.id, a.id, 1, true
    FROM ad_placements p
    CROSS JOIN simple_ads a
    WHERE p.key = 'carousel-slide-3'
    AND a.title LIKE '%カルーセル用%'
    AND a.is_active = true;

END $$;
