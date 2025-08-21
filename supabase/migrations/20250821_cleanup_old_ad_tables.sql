-- シンプル広告システム移行のための不要テーブル削除マイグレーション
-- 実行順序: 外部キー依存関係に基づいて子テーブルから削除

-- 2025-08-21: 複雑な広告システムからシンプルシステムへの移行
-- 削除対象: ad_events, ad_flights, ad_creatives, ad_campaigns
-- 保持対象: advertisers, ad_placements, simple_ads, ad_placement_assignments

-- ステップ1: 外部キー制約の確認とデータバックアップ
-- WARN: 本番実行前にデータバックアップを必ず取得してください

-- ステップ2: 子テーブルから順次削除（依存関係順）

-- 2.1 ad_events テーブル削除（最下位の子テーブル）
drop table if exists ad_events cascade;

-- 2.2 ad_flights テーブル削除
drop table if exists ad_flights cascade;

-- 2.3 ad_creatives テーブル削除
drop table if exists ad_creatives cascade;

-- 2.4 ad_campaigns テーブル削除
drop table if exists ad_campaigns cascade;

-- ステップ3: 不要なインデックス・関数の削除

-- ad_campaigns関連インデックス削除
drop index if exists ad_campaigns_advertiser_id_idx;
drop index if exists ad_campaigns_status_idx;

-- ad_creatives関連インデックス削除  
drop index if exists ad_creatives_campaign_id_idx;

-- ad_flights関連インデックス削除
drop index if exists ad_flights_campaign_idx;
drop index if exists ad_flights_placement_idx;

-- ad_events関連インデックス削除
drop index if exists ad_events_creative_id_idx;
drop index if exists ad_events_placement_id_idx;
drop index if exists ad_events_occurred_at_idx;
drop index if exists ad_events_type_idx;

-- ステップ4: 不要な関数・ビューの削除

-- 旧広告配信関連関数削除
drop function if exists fn_ad_serve_candidates(text);
drop function if exists fn_ad_daily_stats(date);
drop function if exists fn_ad_stats_summary();

-- 集計マテリアライズドビュー削除（存在する場合）
drop materialized view if exists mv_ad_stats_daily;
drop materialized view if exists mv_ad_campaign_summary;

-- ステップ5: 不要なRLSポリシー削除

-- ad_campaignsポリシー削除
drop policy if exists ad_campaigns_select on ad_campaigns;
drop policy if exists ad_campaigns_modify on ad_campaigns;

-- ad_creativesポリシー削除
drop policy if exists ad_creatives_select on ad_creatives;
drop policy if exists ad_creatives_modify on ad_creatives;

-- ad_flightsポリシー削除
drop policy if exists ad_flights_select on ad_flights;
drop policy if exists ad_flights_modify on ad_flights;

-- ad_eventsポリシー削除
drop policy if exists ad_events_select on ad_events;
drop policy if exists ad_events_modify on ad_events;

-- ステップ6: シーケンス削除（存在する場合）
drop sequence if exists ad_events_id_seq;

-- ステップ7: 最終確認用クエリ（コメントアウト状態）
-- 削除後に以下で確認可能:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name LIKE 'ad_%'
-- ORDER BY table_name;

-- ステップ8: クリーンアップ完了後の必要テーブル一覧
-- ✅ advertisers (広告主情報)
-- ✅ ad_placements (配置場所定義) 
-- ✅ simple_ads (シンプル広告コンテンツ)
-- ✅ ad_placement_assignments (配置マッピング)

-- 注意事項:
-- 1. 本マイグレーションは不可逆的です
-- 2. 実行前に必ずデータベース全体のバックアップを取得してください
-- 3. 開発環境で十分にテストしてから本番適用してください
-- 4. 削除されるテーブルに重要なデータがある場合は事前にエクスポートしてください
