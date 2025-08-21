-- カルーセル広告配置を追加するマイグレーション（最終版）
-- 実行日: 2025-08-21
-- 説明: home.carousel.slide-3 配置とデモ広告を追加

-- 1. カルーセル広告配置を追加（重複チェック付き）
INSERT INTO ad_placements (key, description, size, is_active)
SELECT 'home.carousel.slide-3', 'ホームページのカルーセル3枚目スライドに表示される固定広告', 'large', true
WHERE NOT EXISTS (
    SELECT 1 FROM ad_placements WHERE key = 'home.carousel.slide-3'
);

-- 2. カルーセル用デモ広告を作成（重複チェック付き）
INSERT INTO simple_ads (advertiser_id, title, description, click_url, image_url, contract_start_date, contract_end_date, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM advertisers WHERE name = 'BEATNEXUS運営' LIMIT 1),
    'カルーセル広告デモ',
    'カルーセルスライドに最適化された広告です。大きな画像とクリアなメッセージでユーザーの注目を集めます。',
    'https://beatnexus.com/premium',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM simple_ads WHERE title = 'カルーセル広告デモ'
);

-- 3. カルーセル配置に広告を割り当て（重複チェック付き）
DO $$
DECLARE
    placement_id_val UUID;
    ad_id_val UUID;
BEGIN
    -- 配置IDを取得
    SELECT id INTO placement_id_val 
    FROM ad_placements 
    WHERE key = 'home.carousel.slide-3' 
    LIMIT 1;
    
    -- 広告IDを取得
    SELECT id INTO ad_id_val 
    FROM simple_ads 
    WHERE title = 'カルーセル広告デモ' 
    LIMIT 1;
    
    -- 両方のIDが存在し、まだ割り当てがない場合のみ挿入
    IF placement_id_val IS NOT NULL AND ad_id_val IS NOT NULL THEN
        INSERT INTO ad_placement_assignments (placement_id, simple_ad_id, priority, is_pinned, created_at, updated_at)
        SELECT placement_id_val, ad_id_val, 50, true, NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM ad_placement_assignments 
            WHERE placement_id = placement_id_val AND simple_ad_id = ad_id_val
        );
    END IF;
END $$;
--   apa.is_pinned
-- FROM ad_placements p
-- JOIN ad_placement_assignments apa ON p.id = apa.placement_id  
-- JOIN simple_ads s ON apa.simple_ad_id = s.id
-- WHERE p.placement_key = 'home.carousel.slide-3';
