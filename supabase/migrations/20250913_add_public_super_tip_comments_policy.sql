-- Super Tipコメント公開表示用RLSポリシー追加
-- 2025年9月13日 - Super Tipコメントが本番環境で表示されない問題の修正
-- バトル観戦者もpayment_status='succeeded'のSuper Tipコメントを閲覧可能にする

-- バトル観戦者向けのSuper Tipコメント閲覧ポリシーを追加
-- 既存のポリシーはそのまま保持（送信者・受信者・バトル参加者の権限）
CREATE POLICY "Public can view battle super tip comments" ON public.super_tips
  FOR SELECT USING (
    battle_id IS NOT NULL AND 
    payment_status = 'succeeded'
  );

-- 実装メモ:
-- - 既存のRLSポリシーは保持されている
-- - バトルに紐づく（battle_id IS NOT NULL）かつ支払い成功の場合のみ公開
-- - 単独支援（battle_id IS NULL）は引き続き関係者のみ閲覧可能
-- - これによりバトルコメントフィードでSuper Tipコメントが表示されるようになる
