-- Stripe Connect アカウント状況同期機能
-- 作成日時: 2025-08-26 14:00:00
-- 目的: Stripe側とSupabase側のアカウント状況を定期的に同期

-- Stripe Connect アカウント同期関数（将来的にEdge Functionで実装予定）
CREATE OR REPLACE FUNCTION sync_stripe_account_status()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
BEGIN
  -- Stripe Connect アカウントを持つプロファイルを取得
  FOR account_record IN 
    SELECT id, stripe_account_id
    FROM profiles 
    WHERE stripe_account_id IS NOT NULL
  LOOP
    -- 注意: この関数は実際のStripe API呼び出しを行うため、
    -- Edge Functionで実装する必要があります
    -- ここではプレースホルダーとして記載
    
    RAISE NOTICE 'Stripe Account ID: % needs sync', account_record.stripe_account_id;
  END LOOP;
  
  RAISE NOTICE 'Stripe account sync completed';
END;
$$;

-- 関数コメント
COMMENT ON FUNCTION sync_stripe_account_status IS 'Stripe Connect アカウントの状況をSupabaseと同期（Edge Function実装予定）';

-- 手動同期用のクエリテンプレート（管理者用）
/*
-- 特定のStripe Connect アカウントの charges_enabled を更新
UPDATE profiles 
SET stripe_charges_enabled = true -- または false
WHERE stripe_account_id = 'acct_XXXXXXXXXXXXXXXX';

-- 全てのStripe Connect アカウントの状況確認
SELECT 
  username,
  stripe_account_id,
  stripe_charges_enabled,
  stripe_details_submitted,
  created_at
FROM profiles 
WHERE stripe_account_id IS NOT NULL
ORDER BY created_at DESC;
*/
