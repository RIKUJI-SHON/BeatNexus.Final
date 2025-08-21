-- ホームページ広告配置キーの正確な名前への変更と分散配置修正
-- 作成日: 2025-08-21
-- 対象: HomepageTestPageの実際のセクション構造に合わせたキー名への変更

-- 1. 現在のホーム配置場所の割り当てをすべて削除
DELETE FROM ad_placement_assignments 
WHERE placement_id IN (
  SELECT id FROM ad_placements 
  WHERE key IN ('home.wordmark.after.banner', 'home.howitworks.after.inline', 'home.socialproof.after.infeed')
);

-- 2. 配置場所のキー名を実際のセクション名に合わせて更新
UPDATE ad_placements SET 
  key = 'home.wordmark.section.after.banner',
  description = 'ホームページ：ワードマークセクション後（ヒーローセクション前）のバナー広告'
WHERE key = 'home.wordmark.after.banner';

UPDATE ad_placements SET 
  key = 'home.features.section.after.inline', 
  description = 'ホームページ：主要機能詳細セクション後（社会的証明セクション前）のインライン広告'
WHERE key = 'home.howitworks.after.inline';

UPDATE ad_placements SET 
  key = 'home.stats.section.after.infeed',
  description = 'ホームページ：統計・ランキングセクション後（ビジョンセクション前）のインフィード広告'
WHERE key = 'home.socialproof.after.infeed';

-- 3. 更新されたキー名で適切に分散配置を設定
-- ワードマークセクション後: AI作業効率化ツール（目立つ位置にテック系）
INSERT INTO ad_placement_assignments (placement_id, simple_ad_id, priority, is_pinned)
SELECT 
  ap.id,
  sa.id,
  10,
  false
FROM ad_placements ap
CROSS JOIN simple_ads sa
JOIN advertisers adv ON sa.advertiser_id = adv.id
WHERE ap.key = 'home.wordmark.section.after.banner'
AND adv.name = 'テックイノベーション株式会社'
AND sa.title = 'AI作業効率化ツール「WorkFlow Pro」';

-- 主要機能セクション後: 音楽配信サービス（機能説明後にエンタメ系）
INSERT INTO ad_placement_assignments (placement_id, simple_ad_id, priority, is_pinned)
SELECT 
  ap.id,
  sa.id,
  20,
  false
FROM ad_placements ap
CROSS JOIN simple_ads sa
JOIN advertisers adv ON sa.advertiser_id = adv.id
WHERE ap.key = 'home.features.section.after.inline'
AND adv.name = 'ミュージックプラットフォーム'
AND sa.title = '音楽配信サービス「BeatStream」';

-- 統計・ランキングセクション後: バトルロイヤルゲーム（統計データ後にゲーム系）
INSERT INTO ad_placement_assignments (placement_id, simple_ad_id, priority, is_pinned)
SELECT 
  ap.id,
  sa.id,
  30,
  false
FROM ad_placements ap
CROSS JOIN simple_ads sa
JOIN advertisers adv ON sa.advertiser_id = adv.id
WHERE ap.key = 'home.stats.section.after.infeed'
AND adv.name = 'ゲーミングスタジオXYZ'
AND sa.title = 'バトルロイヤルゲーム「Arena Masters」';

-- 4. 結果確認用クエリ（コメントとして記録）
-- SELECT 
--   ap.key,
--   ap.description,
--   sa.title as ad_title,
--   adv.name as advertiser_name,
--   apa.priority
-- FROM ad_placement_assignments apa
-- JOIN ad_placements ap ON apa.placement_id = ap.id
-- JOIN simple_ads sa ON apa.simple_ad_id = sa.id
-- JOIN advertisers adv ON sa.advertiser_id = adv.id
-- WHERE ap.key LIKE 'home.%'
-- ORDER BY ap.key;
