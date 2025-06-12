-- 20250112120100_fix_admin_security.sql
-- 管理者機能とセキュリティの修正

-- 1. 管理者テーブルを作成
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- 2. 管理者テーブルのRLSを有効化
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 3. 管理者のみが管理者テーブルを閲覧できるポリシー
CREATE POLICY "Only admins can view admin users" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id = auth.uid() AND au.is_active = TRUE
    )
  );

-- 4. 管理者のみが新しい管理者を追加できるポリシー
CREATE POLICY "Only admins can insert admin users" ON admin_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id = auth.uid() AND au.is_active = TRUE
    )
  );

-- 5. 管理者確認関数
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() AND is_active = TRUE
  );
END;
$$;

-- 6. 削除されたユーザー確認関数を管理者専用に修正
CREATE OR REPLACE FUNCTION get_deleted_users()
RETURNS TABLE(
  id UUID,
  original_username TEXT,
  deleted_at TIMESTAMPTZ,
  had_battles BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    CASE 
      WHEN p.username LIKE 'deleted-user-%' THEN 'Unknown'
      ELSE p.username
    END as original_username,
    p.deleted_at,
    EXISTS(
      SELECT 1 FROM archived_battles ab 
      WHERE ab.player1_user_id = p.id OR ab.player2_user_id = p.id
    ) as had_battles
  FROM profiles p
  WHERE p.is_deleted = TRUE
  ORDER BY p.deleted_at DESC;
END;
$$;

-- 7. 管理者用のユーザー削除関数（通常の削除とは別）
CREATE OR REPLACE FUNCTION admin_force_delete_user(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- safe_delete_user_account関数を呼び出し
  RETURN safe_delete_user_account(p_user_id);
END;
$$;

-- 8. 管理者用のユーザー統計関数
CREATE OR REPLACE FUNCTION get_user_statistics()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_deleted_users INTEGER;
  v_users_with_battles INTEGER;
BEGIN
  -- 管理者権限チェック
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM profiles;
  
  SELECT COUNT(*) INTO v_active_users 
  FROM profiles WHERE is_deleted = FALSE OR is_deleted IS NULL;
  
  SELECT COUNT(*) INTO v_deleted_users 
  FROM profiles WHERE is_deleted = TRUE;
  
  SELECT COUNT(DISTINCT p.id) INTO v_users_with_battles
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM archived_battles ab 
    WHERE ab.player1_user_id = p.id OR ab.player2_user_id = p.id
  );

  RETURN json_build_object(
    'total_users', v_total_users,
    'active_users', v_active_users,
    'deleted_users', v_deleted_users,
    'users_with_battles', v_users_with_battles,
    'generated_at', NOW()
  );
END;
$$;

-- 9. 重複するRLSポリシーをクリーンアップ
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- 10. profilesのポリシーを統一（削除されたユーザーは非表示）
CREATE POLICY "Active profiles are viewable by everyone" ON profiles
  FOR SELECT USING (is_deleted = FALSE OR is_deleted IS NULL);

-- 11. コメント追加
COMMENT ON TABLE admin_users IS '管理者ユーザーのテーブル。管理機能へのアクセス権限を管理。';
COMMENT ON FUNCTION is_current_user_admin() IS '現在のユーザーが管理者かどうかを確認する関数。';
COMMENT ON FUNCTION get_deleted_users() IS '削除されたユーザー一覧を管理者のみが確認できる関数。';
COMMENT ON FUNCTION admin_force_delete_user(UUID) IS '管理者専用のユーザー削除関数。';
COMMENT ON FUNCTION get_user_statistics() IS '管理者専用のユーザー統計確認関数。';

-- 12. 初回管理者の設定（必要に応じて特定のユーザーIDを指定）
-- 注意: 実際の管理者IDに置き換えてください
-- INSERT INTO admin_users (id, created_by) 
-- VALUES ('YOUR_ADMIN_USER_ID', 'YOUR_ADMIN_USER_ID')
-- ON CONFLICT (id) DO NOTHING; 