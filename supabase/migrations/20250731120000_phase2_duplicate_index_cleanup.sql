-- フェーズ2: 重複インデックス削除マイグレーション
-- 実行日: 2025-07-31
-- 対象: battle_votesテーブルの重複インデックス削除

-- 重複制約削除（使用実績0回のため安全）
-- unique_user_battle_vote 制約を削除し、battle_votes_battle_id_user_id_keyを保持
ALTER TABLE public.battle_votes DROP CONSTRAINT IF EXISTS unique_user_battle_vote;

-- 削除確認のためのコメント
-- battle_votes_battle_id_user_id_key が同一機能を提供するため重複制約を削除
-- これによりストレージ使用量を削減し、制約管理コストを軽減
