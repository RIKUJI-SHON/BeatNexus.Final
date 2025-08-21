-- 本番環境: app_role() 関数の作成とシンプル広告システムのRLSポリシー設定
-- 日時: 2025-08-21
-- 目的: 本番環境でフォールバック広告が表示される問題の修正

-- 1. app_role() 関数の作成
CREATE OR REPLACE FUNCTION app_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', 'end_user');
$$;

-- 2. simple_ads テーブルのRLSポリシー
ALTER TABLE simple_ads ENABLE ROW LEVEL SECURITY;

-- simple_ads の選択権限 (internal_admin, ad_ops, viewer)
CREATE POLICY simple_ads_select ON simple_ads
  FOR SELECT USING (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text, 'viewer'::text])
  );

-- simple_ads の変更権限 (internal_admin, ad_ops のみ)
CREATE POLICY simple_ads_modify ON simple_ads
  FOR ALL USING (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text])
  )
  WITH CHECK (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text])
  );

-- 3. ad_placement_assignments テーブルのRLSポリシー
ALTER TABLE ad_placement_assignments ENABLE ROW LEVEL SECURITY;

-- ad_placement_assignments の選択権限 (internal_admin, ad_ops, viewer)
CREATE POLICY ad_placement_assignments_select ON ad_placement_assignments
  FOR SELECT USING (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text, 'viewer'::text])
  );

-- ad_placement_assignments の変更権限 (internal_admin, ad_ops のみ)
CREATE POLICY ad_placement_assignments_modify ON ad_placement_assignments
  FOR ALL USING (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text])
  )
  WITH CHECK (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text])
  );

-- 4. ad_placements テーブルのRLSポリシー
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;

-- ad_placements の選択権限
DROP POLICY IF EXISTS ad_placements_select ON ad_placements;
CREATE POLICY ad_placements_select ON ad_placements
  FOR SELECT USING (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text, 'viewer'::text])
  );

-- ad_placements の変更権限
DROP POLICY IF EXISTS ad_placements_modify ON ad_placements;
CREATE POLICY ad_placements_modify ON ad_placements
  FOR ALL USING (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text])
  )
  WITH CHECK (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text])
  );

-- 5. advertisers テーブルのRLSポリシー
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;

-- advertisers の選択権限
DROP POLICY IF EXISTS advertisers_select ON advertisers;
CREATE POLICY advertisers_select ON advertisers
  FOR SELECT USING (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text, 'viewer'::text])
  );

-- advertisers の変更権限
DROP POLICY IF EXISTS advertisers_modify ON advertisers;
CREATE POLICY advertisers_modify ON advertisers
  FOR ALL USING (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text])
  )
  WITH CHECK (
    app_role() = ANY (ARRAY['internal_admin'::text, 'ad_ops'::text])
  );
