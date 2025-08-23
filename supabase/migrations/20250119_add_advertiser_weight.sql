-- 広告主テーブルにweight（重み）カラムを追加
-- weightは0-100の値で、広告表示の相対的な重みを表す

ALTER TABLE advertisers 
ADD COLUMN weight INTEGER DEFAULT 10 CHECK (weight >= 0 AND weight <= 100);

-- 既存の広告主にデフォルト値を設定
UPDATE advertisers SET weight = 10 WHERE weight IS NULL;

-- weightカラムをNOT NULLに変更
ALTER TABLE advertisers 
ALTER COLUMN weight SET NOT NULL;

-- インデックス追加（パフォーマンス向上）
CREATE INDEX idx_advertisers_weight_active ON advertisers(weight, is_active) WHERE is_active = true;

-- コメント追加
COMMENT ON COLUMN advertisers.weight IS '広告表示の相対重み (0-100): 値が大きいほど表示確率が高い';
