-- 本番環境デプロイ前確認スクリプト
-- 実行前に必要な依存関係とデータ状況を確認

-- 1. 基本広告システムテーブルの存在確認
DO $$
BEGIN
  -- ad_placementsテーブルの存在確認
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ad_placements') THEN
    RAISE EXCEPTION '基本広告システムが未展開です。先に20250821_production_minimal_ad_system.sql を実行してください。';
  END IF;
  
  -- simple_adsテーブルの存在確認
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'simple_ads') THEN
    RAISE EXCEPTION 'simple_adsテーブルが存在しません。基本広告システムを先に展開してください。';
  END IF;
  
  -- ad_placement_assignmentsテーブルの存在確認
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ad_placement_assignments') THEN
    RAISE EXCEPTION 'ad_placement_assignmentsテーブルが存在しません。基本広告システムを先に展開してください。';
  END IF;
  
  RAISE NOTICE '✅ 基本広告システムテーブルは正常に存在します。';
END $$;

-- 2. 現在の配置状況確認
SELECT 
  '現在の配置状況' as info,
  count(*) as total_placements,
  count(case when key ~ '^battles\.list\.after-[0-9]+\.infeed$' then 1 end) as battle_list_placements,
  count(case when key = 'battles.list.after-3.infeed' then 1 end) as has_after_3,
  count(case when key = 'battles.list.after-10.infeed' then 1 end) as has_after_10
FROM ad_placements;

-- 3. 広告データの確認
SELECT 
  '広告データ状況' as info,
  count(*) as total_ads,
  count(case when is_active = true then 1 end) as active_ads,
  count(case when is_active = true 
                and contract_start_date <= current_date 
                and contract_end_date >= current_date then 1 end) as valid_contract_ads
FROM simple_ads;

-- 4. 既存の割り当て状況確認
SELECT 
  '割り当て状況' as info,
  count(*) as total_assignments,
  count(distinct placement_id) as unique_placements_assigned,
  count(distinct simple_ad_id) as unique_ads_assigned
FROM ad_placement_assignments;

-- 実行可能性判定
DO $$
DECLARE
  battle_placements_count integer;
  active_ads_count integer;
BEGIN
  -- バトル配置の数を確認
  SELECT count(*) INTO battle_placements_count
  FROM ad_placements 
  WHERE key ~ '^battles\.list\.after-[0-9]+\.infeed$';
  
  -- アクティブ広告の数を確認
  SELECT count(*) INTO active_ads_count
  FROM simple_ads 
  WHERE is_active = true 
    AND contract_start_date <= current_date 
    AND contract_end_date >= current_date;
  
  RAISE NOTICE '判定結果:';
  RAISE NOTICE '  - バトル配置数: %', battle_placements_count;
  RAISE NOTICE '  - アクティブ広告数: %', active_ads_count;
  
  IF battle_placements_count >= 11 THEN
    RAISE NOTICE '✅ 3件ごと配置は既に設定済みです。';
  ELSIF battle_placements_count >= 2 THEN
    RAISE NOTICE '⚠️  部分的に配置が存在します。追加配置を実行してください。';
  ELSE
    RAISE NOTICE '🔄 新規配置が必要です。';
  END IF;
  
  IF active_ads_count > 0 THEN
    RAISE NOTICE '✅ 広告データが存在するため、割り当て処理が実行されます。';
  ELSE
    RAISE NOTICE '⚠️  アクティブ広告がありません。先に広告データを作成してください。';
  END IF;
END $$;
