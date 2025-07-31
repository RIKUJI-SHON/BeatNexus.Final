-- フェーズ2: 外部キーインデックス追加マイグレーション
-- 実行日: 2025-07-31
-- 対象: パフォーマンス重要度の高い外部キーカラムにインデックス追加

-- 高優先度: commentsテーブル
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- 高優先度: notificationsテーブル
CREATE INDEX IF NOT EXISTS idx_notifications_related_season_id ON public.notifications(related_season_id);

-- 高優先度: postsテーブル
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);

-- 中優先度: communitiesテーブル
CREATE INDEX IF NOT EXISTS idx_communities_owner_user_id ON public.communities(owner_user_id);

-- 中優先度: community_chat_messagesテーブル
CREATE INDEX IF NOT EXISTS idx_community_chat_messages_user_id ON public.community_chat_messages(user_id);

-- インデックス作成完了
-- 開発環境では通常のCREATE INDEXで実行
-- 本番環境では個別にCONCURRENTLYで実行予定
