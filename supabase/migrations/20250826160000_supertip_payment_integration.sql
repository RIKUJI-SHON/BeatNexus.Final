-- SuperTip決済機能の本番環境マイグレーション
-- 作成日: 2025-08-26
-- 目的: SuperTip投票機能を本番環境に適用

-- 1. battle_votesテーブルにSuperTip関連カラムを追加
ALTER TABLE battle_votes 
ADD COLUMN IF NOT EXISTS super_tip_amount INTEGER,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'canceled'));

-- 2. super_tipsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS super_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_user_id UUID REFERENCES profiles(id),
    active_battle_id UUID REFERENCES active_battles(id),
    archived_battle_id UUID REFERENCES archived_battles(id),
    supported_player_user_id UUID NOT NULL REFERENCES profiles(id),
    amount_jpy INTEGER NOT NULL CHECK (amount_jpy > 0),
    stripe_payment_intent_id TEXT,
    stripe_account_id TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'canceled')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 制約
    CHECK (
        (active_battle_id IS NOT NULL AND archived_battle_id IS NULL) OR 
        (active_battle_id IS NULL AND archived_battle_id IS NOT NULL)
    )
);

-- 3. execute_super_tip_vote_transaction関数を作成（存在しない場合）
CREATE OR REPLACE FUNCTION execute_super_tip_vote_transaction(
  p_battle_id UUID,
  p_user_id UUID,
  p_vote CHAR(1),
  p_comment TEXT DEFAULT NULL,
  p_super_tip_amount INTEGER,
  p_supported_player_user_id UUID,
  p_stripe_payment_intent_id TEXT,
  p_stripe_account_id TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_id UUID;
  v_vote_count_increment INTEGER;
  v_season_vote_points_increment INTEGER;
  v_current_user_id UUID;
BEGIN
  -- 認証確認（通常投票と同じ方式）
  v_current_user_id := auth.uid();
  
  -- 認証が必要（通常投票と同じエラーメッセージ）
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- 認証されたユーザーIDと提供されたユーザーIDが一致することを確認
  IF v_current_user_id != p_user_id THEN
    RAISE EXCEPTION 'Authentication mismatch';
  END IF;
  
  -- バトルが存在し、アクティブであることを確認
  IF NOT EXISTS (
    SELECT 1 FROM active_battles 
    WHERE id = p_battle_id 
    AND status = 'ACTIVE' 
    AND end_voting_at > NOW()
  ) THEN
    RAISE EXCEPTION 'バトルが存在しないか、投票期間が終了しています';
  END IF;
  
  -- 重複投票チェック
  IF EXISTS (
    SELECT 1 FROM battle_votes 
    WHERE battle_id = p_battle_id 
    AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION '既にこのバトルに投票済みです';
  END IF;
  
  -- プレイヤーがバトルに参加していることを確認
  IF NOT EXISTS (
    SELECT 1 FROM active_battles 
    WHERE id = p_battle_id 
    AND (player1_user_id = p_supported_player_user_id OR player2_user_id = p_supported_player_user_id)
  ) THEN
    RAISE EXCEPTION 'このプレイヤーはこのバトルに参加していません';
  END IF;
  
  -- 現在のシーズンIDを取得
  SELECT id INTO v_season_id 
  FROM seasons 
  WHERE status = 'active' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- 投票タイプに応じたポイント計算（投票仕様書v6準拠）
  IF p_comment IS NOT NULL AND TRIM(p_comment) != '' THEN
    -- コメント付きSuperTip投票: +3ポイント
    v_vote_count_increment := 3;
    v_season_vote_points_increment := 3;
  ELSE
    -- 通常SuperTip投票: +1ポイント
    v_vote_count_increment := 1;
    v_season_vote_points_increment := 1;
  END IF;
  
  -- 投票レコード作成（通常投票と同じ方式、RLS回避なし）
  INSERT INTO battle_votes (
    battle_id,
    user_id,
    vote,
    comment,
    season_id,
    super_tip_amount,
    stripe_payment_intent_id,
    payment_status
  ) VALUES (
    p_battle_id,
    p_user_id,
    p_vote::CHAR(1),
    p_comment,
    v_season_id,
    p_super_tip_amount,
    p_stripe_payment_intent_id,
    'pending'
  );
  
  -- SuperTipレコード作成
  INSERT INTO super_tips (
    voter_user_id,
    active_battle_id,
    supported_player_user_id,
    amount_jpy,
    stripe_payment_intent_id,
    stripe_account_id,
    payment_status,
    metadata
  ) VALUES (
    p_user_id,
    p_battle_id,
    p_supported_player_user_id,
    p_super_tip_amount,
    p_stripe_payment_intent_id,
    p_stripe_account_id,
    'pending',
    jsonb_build_object(
      'vote', p_vote,
      'comment', p_comment,
      'created_via', 'vote_with_super_tip',
      'vote_points_awarded', v_vote_count_increment
    )
  );
  
  -- バトルの投票数更新
  IF p_vote = 'A' THEN
    UPDATE active_battles 
    SET votes_a = votes_a + 1, updated_at = NOW()
    WHERE id = p_battle_id;
  ELSE
    UPDATE active_battles 
    SET votes_b = votes_b + 1, updated_at = NOW()
    WHERE id = p_battle_id;
  END IF;
  
  -- ユーザーの投票数更新（投票仕様書v6準拠）
  IF v_season_id IS NOT NULL THEN
    -- シーズンがアクティブな場合: 両方のポイントを更新
    UPDATE profiles 
    SET 
      vote_count = vote_count + v_vote_count_increment,
      season_vote_points = season_vote_points + v_season_vote_points_increment
    WHERE id = p_user_id;
  ELSE
    -- シーズンが非アクティブな場合: vote_countのみ更新
    UPDATE profiles 
    SET vote_count = vote_count + v_vote_count_increment
    WHERE id = p_user_id;
  END IF;
  
  -- 成功ログ（audit_logsテーブルが存在する場合のみ）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      table_name,
      action,
      user_id,
      details,
      function_name,
      success
    ) VALUES (
      'super_tips',
      'INSERT',
      p_user_id,
      jsonb_build_object(
        'battle_id', p_battle_id,
        'super_tip_amount', p_super_tip_amount,
        'supported_player_user_id', p_supported_player_user_id,
        'stripe_payment_intent_id', p_stripe_payment_intent_id,
        'vote_count_increment', v_vote_count_increment,
        'season_vote_points_increment', v_season_vote_points_increment,
        'season_id', v_season_id,
        'has_comment', (p_comment IS NOT NULL AND TRIM(p_comment) != ''),
        'production_deployment', true
      ),
      'execute_super_tip_vote_transaction',
      true
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログ（audit_logsテーブルが存在する場合のみ）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
      INSERT INTO audit_logs (
        table_name,
        action,
        user_id,
        details,
        function_name,
        success,
        error_message
      ) VALUES (
        'super_tips',
        'INSERT',
        p_user_id,
        jsonb_build_object(
          'battle_id', p_battle_id,
          'super_tip_amount', p_super_tip_amount,
          'error', SQLERRM,
          'production_deployment', true
        ),
        'execute_super_tip_vote_transaction',
        false,
        SQLERRM
      );
    END IF;
    
    -- エラーを再発生
    RAISE;
END;
$$;

-- 4. 適切な権限を設定
GRANT EXECUTE ON FUNCTION execute_super_tip_vote_transaction TO authenticated;

-- 5. インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_super_tips_voter_user_id ON super_tips(voter_user_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_active_battle_id ON super_tips(active_battle_id);
CREATE INDEX IF NOT EXISTS idx_super_tips_stripe_payment_intent_id ON super_tips(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_battle_votes_super_tip_amount ON battle_votes(super_tip_amount) WHERE super_tip_amount IS NOT NULL;

-- 6. RLSポリシーの設定
ALTER TABLE super_tips ENABLE ROW LEVEL SECURITY;

-- SuperTip閲覧ポリシー（認証ユーザーは全て閲覧可能）
CREATE POLICY "super_tips_select_policy" ON super_tips
  FOR SELECT
  TO authenticated
  USING (true);

-- SuperTip作成ポリシー（自分のものだけ作成可能）
CREATE POLICY "super_tips_insert_policy" ON super_tips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = voter_user_id);

-- 7. trigger関数でupdated_atを自動更新
CREATE OR REPLACE FUNCTION update_super_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER super_tips_updated_at_trigger
  BEFORE UPDATE ON super_tips
  FOR EACH ROW
  EXECUTE FUNCTION update_super_tips_updated_at();

-- マイグレーション完了のログ
DO $$
BEGIN
  RAISE NOTICE 'SuperTip決済機能のマイグレーションが完了しました - %', NOW();
END $$;
