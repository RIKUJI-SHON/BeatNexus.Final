-- マイグレーション: 本番環境にカルーセル広告配置を追加
-- 作成日: 2025-08-21
-- 説明: 統一キー命名規則に従ったホームページカルーセル配置場所を本番環境に追加

-- カルーセル配置場所を追加（統一キー形式）
INSERT INTO ad_placements (key, description, is_active, size)
VALUES (
  'home.hero.section.after.carousel',
  'ホームページ：ヒーローセクション後のカルーセル広告（統一キー形式）',
  true,
  'carousel'
)
ON CONFLICT (key) DO NOTHING;

-- 確認用：追加された配置場所をログ
DO $$
BEGIN
  RAISE NOTICE 'カルーセル広告配置 "home.hero.section.after.carousel" を追加しました（または既存）';
END $$;
