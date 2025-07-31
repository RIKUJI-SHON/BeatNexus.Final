-- Emergency Security Fixes
-- 緊急セキュリティ修正：RLS未設定テーブルのポリシー追加

-- community_chat_messages テーブルのRLSポリシー追加
CREATE POLICY "Users can view messages in their communities" ON community_chat_messages
FOR SELECT USING (
    EXISTS(
        SELECT 1 FROM community_members cm 
        WHERE cm.community_id = community_chat_messages.community_id 
        AND cm.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Members can post messages" ON community_chat_messages
FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid()) AND
    EXISTS(
        SELECT 1 FROM community_members cm 
        WHERE cm.community_id = community_chat_messages.community_id 
        AND cm.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Users can update their own messages" ON community_chat_messages
FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own messages" ON community_chat_messages
FOR DELETE USING (user_id = (SELECT auth.uid()));

-- community_members テーブルのRLSポリシー追加
CREATE POLICY "Users can view community members" ON community_members
FOR SELECT USING (true); -- コミュニティメンバーは誰でも閲覧可能

CREATE POLICY "Users can join communities" ON community_members
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Community owners can manage members" ON community_members
FOR UPDATE USING (
    EXISTS(
        SELECT 1 FROM communities c 
        WHERE c.id = community_members.community_id 
        AND c.owner_user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Community owners can remove members" ON community_members
FOR DELETE USING (
    EXISTS(
        SELECT 1 FROM communities c 
        WHERE c.id = community_members.community_id 
        AND c.owner_user_id = (SELECT auth.uid())
    )
    OR user_id = (SELECT auth.uid()) -- ユーザー自身は退会可能
);

-- email_template_specs テーブルのRLSポリシー追加
CREATE POLICY "Service role access only" ON email_template_specs
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- セキュリティログ記録
INSERT INTO audit_logs (action, table_name, details, created_at)
VALUES 
    ('RLS_POLICY_ADDED', 'community_chat_messages', 'Added comprehensive RLS policies', NOW()),
    ('RLS_POLICY_ADDED', 'community_members', 'Added comprehensive RLS policies', NOW()),
    ('RLS_POLICY_ADDED', 'email_template_specs', 'Added service role only policy', NOW());
