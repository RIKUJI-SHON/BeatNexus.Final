-- SuperTip投票システムの投票仕様書準拠修正
-- 作成日時: 2025-08-26 13:30:00
-- 目的: SuperTip投票でも既存の投票ポイントシステムに準拠するよう修正

-- SuperTip投票トランザクション関数を投票仕様書v6に準拠するよう修正
CREATE OR REPLACE FUNCTION execute_super_tip_vote_transaction(
  p_battle_id UUID,
  p_user_id UUID,
  p_vote CHAR(1),
  p_comment TEXT,
  p_super_tip_amount INTEGER,
  p_supported_player_user_id UUID,
  p_stripe_payment_intent_id TEXT,
  p_stripe_account_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_id UUID;
  v_vote_count_increment INTEGER;
  v_season_vote_points_increment INTEGER;
BEGIN
  -- トランザクション開始（暗黙的）
  
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
  
  -- 投票レコード作成
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
  
  -- 成功ログ
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
      'has_comment', (p_comment IS NOT NULL AND TRIM(p_comment) != '')
    ),
    'execute_super_tip_vote_transaction',
    true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログ
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
        'error', SQLERRM
      ),
      'execute_super_tip_vote_transaction',
      false,
      SQLERRM
    );
    
    -- エラーを再発生
    RAISE;
END;
$$;

-- 関数へのアクセス権限設定
GRANT EXECUTE ON FUNCTION execute_super_tip_vote_transaction TO authenticated;

-- 関数コメント更新
COMMENT ON FUNCTION execute_super_tip_vote_transaction IS 'SuperTip付き投票のアトミックなトランザクション処理（投票仕様書v6準拠: コメント付き+3pt、通常+1pt、シーズンポイント連携）';

-- マイグレーション適用確認用のテスト関数
CREATE OR REPLACE FUNCTION test_super_tip_vote_points()
RETURNS TABLE(
  test_name TEXT,
  expected_vote_count INTEGER,
  expected_season_points INTEGER,
  result TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- テスト用の結果を返す（実際のテストは手動で実行）
  RETURN QUERY
  SELECT 
    'コメント付きSuperTip投票'::TEXT,
    3::INTEGER,
    3::INTEGER,
    'コメントがある場合は+3ポイント'::TEXT
  UNION ALL
  SELECT 
    '通常SuperTip投票'::TEXT,
    1::INTEGER,
    1::INTEGER,
    'コメントがない場合は+1ポイント'::TEXT
  UNION ALL
  SELECT 
    'シーズン非アクティブ時'::TEXT,
    1::INTEGER,
    0::INTEGER,
    'season_vote_pointsは更新されない'::TEXT;
END;
$$;

-- テスト関数の実行権限
GRANT EXECUTE ON FUNCTION test_super_tip_vote_points TO authenticated;

COMMENT ON FUNCTION test_super_tip_vote_points IS 'SuperTip投票ポイントシステムのテスト用関数（期待値確認用）';
