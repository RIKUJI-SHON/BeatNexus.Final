-- Weight-based広告主選択のためのデータベース関数
-- 確率的選択アルゴリズムを実装

CREATE OR REPLACE FUNCTION weighted_random_advertiser()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    total_weight INTEGER := 0;
    random_value INTEGER;
    cumulative_weight INTEGER := 0;
    current_advertiser_id UUID;
    current_weight INTEGER;
    selected_advertiser_id UUID;
    advertiser_cursor CURSOR FOR 
        SELECT id, weight 
        FROM advertisers 
        WHERE is_active = true AND weight > 0
        ORDER BY weight DESC;
BEGIN
    -- アクティブな広告主の総重みを計算
    SELECT COALESCE(SUM(weight), 0) 
    INTO total_weight 
    FROM advertisers 
    WHERE is_active = true AND weight > 0;
    
    -- 広告主が存在しない場合はNULLを返す
    IF total_weight = 0 THEN
        RETURN NULL;
    END IF;
    
    -- 1からtotal_weightまでのランダム値を生成
    random_value := floor(random() * total_weight) + 1;
    
    -- カーソルを使用してweightベースの選択を実行
    OPEN advertiser_cursor;
    LOOP
        FETCH advertiser_cursor INTO current_advertiser_id, current_weight;
        EXIT WHEN NOT FOUND;
        
        cumulative_weight := cumulative_weight + current_weight;
        
        IF random_value <= cumulative_weight THEN
            selected_advertiser_id := current_advertiser_id;
            EXIT;
        END IF;
    END LOOP;
    CLOSE advertiser_cursor;
    
    RETURN selected_advertiser_id;
END;
$$;

-- 使用例コメント
COMMENT ON FUNCTION weighted_random_advertiser() IS 'Weightベースで広告主をランダム選択。weightが大きいほど選択確率が高い';

-- テスト用のview作成（デバッグ用）
CREATE OR REPLACE VIEW advertiser_weight_distribution AS
SELECT 
    a.id,
    a.name,
    a.weight,
    ROUND(
        (a.weight * 100.0 / NULLIF(SUM(a.weight) OVER(), 0)), 2
    ) as selection_probability_percent
FROM advertisers a
WHERE a.is_active = true AND a.weight > 0
ORDER BY a.weight DESC;
