-- 簡略化されたweight-based広告選択関数
-- placement assignmentを無視して、全ての有効な広告からweight-basedで選択

CREATE OR REPLACE FUNCTION weighted_random_ad()
RETURNS TABLE(
    ad_id UUID,
    advertiser_id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    click_url TEXT,
    advertiser_name TEXT,
    advertiser_weight INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_weight INTEGER := 0;
    random_value INTEGER;
    cumulative_weight INTEGER := 0;
    current_ad RECORD;
    selected_ad RECORD;
    ad_cursor CURSOR FOR 
        SELECT 
            sa.id as ad_id,
            sa.advertiser_id,
            sa.title,
            sa.description,
            sa.image_url,
            sa.click_url,
            a.name as advertiser_name,
            a.weight as advertiser_weight
        FROM simple_ads sa
        JOIN advertisers a ON sa.advertiser_id = a.id
        WHERE sa.is_active = true 
          AND a.is_active = true 
          AND a.weight > 0
          AND sa.contract_start_date <= CURRENT_DATE
          AND sa.contract_end_date >= CURRENT_DATE
        ORDER BY a.weight DESC, sa.created_at ASC;
BEGIN
    -- アクティブな広告の総重みを計算（広告主のweightベース）
    SELECT COALESCE(SUM(a.weight), 0) 
    INTO total_weight 
    FROM simple_ads sa
    JOIN advertisers a ON sa.advertiser_id = a.id
    WHERE sa.is_active = true 
      AND a.is_active = true 
      AND a.weight > 0
      AND sa.contract_start_date <= CURRENT_DATE
      AND sa.contract_end_date >= CURRENT_DATE;
    
    -- 有効な広告が存在しない場合はNULLを返す
    IF total_weight = 0 THEN
        RETURN;
    END IF;
    
    -- 1からtotal_weightまでのランダム値を生成
    random_value := floor(random() * total_weight) + 1;
    
    -- カーソルを使用してweight-basedの選択を実行
    OPEN ad_cursor;
    LOOP
        FETCH ad_cursor INTO current_ad;
        EXIT WHEN NOT FOUND;
        
        cumulative_weight := cumulative_weight + current_ad.advertiser_weight;
        
        IF random_value <= cumulative_weight THEN
            selected_ad := current_ad;
            EXIT;
        END IF;
    END LOOP;
    CLOSE ad_cursor;
    
    -- 選択された広告を返す
    IF selected_ad IS NOT NULL THEN
        RETURN QUERY SELECT 
            selected_ad.ad_id,
            selected_ad.advertiser_id,
            selected_ad.title,
            selected_ad.description,
            selected_ad.image_url,
            selected_ad.click_url,
            selected_ad.advertiser_name,
            selected_ad.advertiser_weight;
    END IF;
END;
$$;

-- 使用例コメント
COMMENT ON FUNCTION weighted_random_ad() IS '全ての有効な広告からweight-basedで1つ選択。placement assignmentは無視';

-- テスト用のview作成（デバッグ用）
CREATE OR REPLACE VIEW ad_weight_distribution AS
SELECT 
    sa.id as ad_id,
    sa.title,
    a.name as advertiser_name,
    a.weight as advertiser_weight,
    ROUND(
        (a.weight * 100.0 / NULLIF(
            (SELECT SUM(DISTINCT a2.weight) 
             FROM simple_ads sa2 
             JOIN advertisers a2 ON sa2.advertiser_id = a2.id 
             WHERE sa2.is_active = true 
               AND a2.is_active = true 
               AND a2.weight > 0), 0
        )), 2
    ) as selection_probability_percent
FROM simple_ads sa
JOIN advertisers a ON sa.advertiser_id = a.id
WHERE sa.is_active = true 
  AND a.is_active = true 
  AND a.weight > 0
  AND sa.contract_start_date <= CURRENT_DATE
  AND sa.contract_end_date >= CURRENT_DATE
ORDER BY a.weight DESC, sa.title;
