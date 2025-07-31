-- フェーズ3: ステップ1 - 残存外部キーインデックス追加
-- 作成日: 2025-07-31
-- 対象: archived_battles, security_audit_log テーブル

-- archived_battles テーブルの外部キーインデックス追加
CREATE INDEX IF NOT EXISTS idx_archived_battles_player2_user_id ON public.archived_battles(player2_user_id);
CREATE INDEX IF NOT EXISTS idx_archived_battles_winner_id ON public.archived_battles(winner_id);

-- security_audit_log テーブルの外部キーインデックス追加
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);

-- コメント: これらのインデックスは外部キー制約のパフォーマンスを向上させます
