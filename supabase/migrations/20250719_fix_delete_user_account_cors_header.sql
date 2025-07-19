-- 20250719_fix_delete_user_account_cors_header.sql
-- delete-user-accountエッジファンクションのCORSヘッダーにx-client-versionを追加
-- 関数本体のロジックは変更しない
-- MCP SERVER経由で開発環境(wdttluticnlqzmqmfvgt)へ適用

-- 手順: supabase/functions/delete-user-account/index.ts のCORSヘッダーを修正
-- 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-version',

-- このSQLはドキュメント用途です。実際の修正はTypeScriptファイルにて行います。

-- 実装ログ: .cursor/rules/dev-rules/20250719_fix_delete_user_account_cors_header.mdc にも記録予定
