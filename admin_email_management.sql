-- 🛠️ BeatNexus 管理者用: メールアドレス管理ツール
-- 削除済みアカウントのメールアドレス再利用問題を解決するためのスクリプト

-- ==========================================
-- 📊 診断: メールアドレスの使用状況確認
-- ==========================================

-- 1. 全体的な状況確認
SELECT 
  'Total Users' as category,
  count(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Deleted Email Users',
  count(*)
FROM auth.users
WHERE email LIKE '%@deleted.local'
UNION ALL
SELECT 
  'Active Users',
  count(*)
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE p.is_deleted = FALSE
UNION ALL
SELECT 
  'Soft Deleted Users',
  count(*)
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE p.is_deleted = TRUE;

-- 2. 特定のメールアドレスが利用可能かチェック
-- 使用方法: 以下のコメントアウトを外して、実際のメールアドレスに置き換えてください
-- SELECT check_email_availability('問題のメールアドレス@example.com');

-- ==========================================
-- 🔧 修復: メールアドレス解放ツール
-- ==========================================

-- 3. 削除済みユーザーの一覧と詳細確認
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  p.is_deleted,
  p.deleted_at,
  p.username,
  u.raw_user_meta_data->>'deleted_at' as auth_deleted_metadata,
  u.raw_user_meta_data->>'original_email_hash' as original_email_hash
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.is_deleted = TRUE
   OR u.email LIKE '%@deleted.local'
ORDER BY u.created_at DESC;

-- 4. 特定のメールアドレスを強制解放（管理者用）
-- ⚠️ 注意: 削除済みアカウントのメールアドレスのみ解放可能
-- 使用方法: 以下のコメントアウトを外して、実際のメールアドレスに置き換えてください
-- SELECT force_release_deleted_email('解放したいメールアドレス@example.com');

-- ==========================================
-- 🚨 緊急修復: 孤立したauth.usersレコードのクリーンアップ
-- ==========================================

-- 5. profilesテーブルにないauth.usersレコードを確認
SELECT 
  u.id,
  u.email,
  u.created_at,
  'ORPHANED_AUTH_USER' as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.email NOT LIKE 'test%@example.com'; -- テストユーザーは除外

-- 6. 孤立したauth.usersレコードを削除（⚠️ 慎重に実行）
-- 注意: 必ず上記のクエリで確認してから実行してください
/*
DELETE FROM auth.users 
WHERE id IN (
  SELECT u.id
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  WHERE p.id IS NULL
    AND u.email NOT LIKE 'test%@example.com'
    AND u.created_at < NOW() - INTERVAL '1 day' -- 1日以上前に作成されたもののみ
);
*/

-- ==========================================
-- 📋 使用方法とトラブルシューティング
-- ==========================================

/*
🔍 問題診断手順:
1. 上記の「診断」セクションのクエリを実行
2. 問題のメールアドレスで check_email_availability() を実行
3. 結果に応じて適切な修復方法を選択

🛠️ 修復方法:
A. ソフト削除済みアカウントのメール解放:
   - force_release_deleted_email('メールアドレス') を実行

B. 孤立したauth.usersレコードの削除:
   - 上記の確認クエリ実行後、削除クエリを実行

C. メタデータの修復:
   - fix_deleted_users_metadata() を実行

🚨 注意事項:
- 本番環境では必ずバックアップを取ってから実行
- アクティブユーザーのメールアドレスは絶対に変更しない
- 削除操作は元に戻せないため、十分に確認してから実行

📞 サポート:
問題が解決しない場合は、以下の情報を含めて報告してください:
- 問題のメールアドレス（機密情報は除く）
- 上記診断クエリの結果
- エラーメッセージ（もしあれば）
*/ 