-- Duplicate Index Cleanup
-- 重複インデックスのクリーンアップ

-- battle_votes テーブルの重複インデックス削除
-- unique_user_battle_vote を削除し、battle_votes_battle_id_user_id_key を保持
DROP INDEX IF EXISTS unique_user_battle_vote;

-- 削除確認とログ記録
DO $$
BEGIN
    -- インデックスが存在するかチェック
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'unique_user_battle_vote'
        AND tablename = 'battle_votes'
        AND schemaname = 'public'
    ) THEN
        RAISE NOTICE 'Index unique_user_battle_vote still exists';
    ELSE
        RAISE NOTICE 'Index unique_user_battle_vote successfully dropped';
    END IF;
    
    -- 保持するインデックスの確認
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'battle_votes_battle_id_user_id_key'
        AND tablename = 'battle_votes'
        AND schemaname = 'public'
    ) THEN
        RAISE NOTICE 'Primary index battle_votes_battle_id_user_id_key preserved';
    ELSE
        RAISE WARNING 'Primary index battle_votes_battle_id_user_id_key missing - this may cause issues';
    END IF;
END $$;

-- インデックス削除ログ
INSERT INTO audit_logs (action, table_name, details, created_at)
VALUES ('INDEX_REMOVED', 'battle_votes', 'Removed duplicate index unique_user_battle_vote, kept battle_votes_battle_id_user_id_key', NOW());

-- 重複インデックス削除により節約されたストレージ容量を推定
-- (実際のサイズは pg_relation_size() で確認可能)
COMMENT ON TABLE battle_votes IS 'Duplicate index cleanup completed - storage space optimized';
