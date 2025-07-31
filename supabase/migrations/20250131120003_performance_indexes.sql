-- Performance Optimization: Foreign Key Indexes
-- パフォーマンス最適化：外部キーインデックスの追加

-- 高優先度: コメント関連インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- 高優先度: 通知関連インデックス  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_related_season_id ON notifications(related_season_id);

-- 高優先度: 投稿関連インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- 中優先度: コミュニティ関連インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_owner_user_id ON communities(owner_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_chat_messages_user_id ON community_chat_messages(user_id);

-- プロファイル関連インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_current_community_id ON profiles(current_community_id);

-- セキュリティ監査ログインデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);

-- アーカイブバトル関連インデックス（開発環境のみ）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_archived_battles_player2_user_id ON archived_battles(player2_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_archived_battles_winner_id ON archived_battles(winner_id);

-- パフォーマンステスト用コメント
COMMENT ON INDEX idx_comments_post_id IS 'Foreign key index for comments.post_id - improves JOIN performance';
COMMENT ON INDEX idx_comments_user_id IS 'Foreign key index for comments.user_id - improves user comment queries';
COMMENT ON INDEX idx_notifications_related_season_id IS 'Foreign key index for notifications.related_season_id - improves season notification queries';
COMMENT ON INDEX idx_posts_user_id IS 'Foreign key index for posts.user_id - improves user post queries';

-- インデックス作成ログ
INSERT INTO audit_logs (action, table_name, details, created_at)
VALUES 
    ('INDEX_CREATED', 'comments', 'Added foreign key indexes for post_id and user_id', NOW()),
    ('INDEX_CREATED', 'notifications', 'Added foreign key index for related_season_id', NOW()),
    ('INDEX_CREATED', 'posts', 'Added foreign key index for user_id', NOW()),
    ('INDEX_CREATED', 'communities', 'Added foreign key index for owner_user_id', NOW());
