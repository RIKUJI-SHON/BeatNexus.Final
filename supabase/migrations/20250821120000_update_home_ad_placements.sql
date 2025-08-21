-- 現在のホーム画面広告配置データの削除と正しい配置場所への移行
-- 作成日: 2025-08-21
-- 対象: HomepageTestPage（実際に使用されているホームページ）に広告配置を移行

-- 1. 既存のホーム関連広告配置の割り当てを削除
DELETE FROM ad_placement_assignments 
WHERE placement_id IN (
  SELECT id FROM ad_placements WHERE key LIKE 'home.%'
);

-- 2. 既存のホーム関連広告配置場所を削除
DELETE FROM ad_placements WHERE key LIKE 'home.%';

-- 3. HomepageTestPage（実際のホームページ）用の新しい広告配置場所を作成
INSERT INTO ad_placements (key, description, is_active) VALUES
  -- ワードマークセクション後のバナー広告（ヒーロー前）
  ('home.wordmark.after.banner', 'ホームページのワードマークセクション後に表示される横長バナー広告', true),
  
  -- How It Worksセクション後のインライン広告（社会的証明前）
  ('home.howitworks.after.inline', 'ホームページのHow It Worksセクション後に表示されるインライン広告', true),
  
  -- 社会的証明（統計）セクション後のインフィード広告（ビジョン前）  
  ('home.socialproof.after.infeed', 'ホームページの社会的証明セクション後に表示されるインフィード広告', true);

-- 4. 更新内容の確認用クエリ（コメントとして記録）
-- SELECT key, description, is_active FROM ad_placements WHERE key LIKE 'home.%' ORDER BY key;
