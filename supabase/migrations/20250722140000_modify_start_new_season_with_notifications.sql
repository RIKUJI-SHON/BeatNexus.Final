-- Migration: Modify start_new_season function to create season start notifications
-- Created: 2025-07-22

-- 既存の関数を削除
DROP FUNCTION IF EXISTS start_new_season();

-- 修正版の関数を作成 (通知機能付き)
CREATE OR REPLACE FUNCTION start_new_season()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_active_season RECORD;
  v_target_season RECORD;
  v_current_time TIMESTAMPTZ := NOW();
  v_user_count INTEGER := 0;
BEGIN
  -- アクティブなシーズンが既に存在するかチェック
  SELECT * INTO v_existing_active_season
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'active_season_exists',
      'message', 'アクティブなシーズンが既に存在します',
      'existing_season', json_build_object(
        'id', v_existing_active_season.id,
        'name', v_existing_active_season.name,
        'start_at', v_existing_active_season.start_at,
        'end_at', v_existing_active_season.end_at
      )
    );
  END IF;

  -- upcomingシーズンの中で、開始時間が現在時刻より前で最も近いものを取得
  SELECT * INTO v_target_season
  FROM seasons 
  WHERE status = 'upcoming'          -- upcomingのみ対象（endedを除外）
    AND start_at <= v_current_time   -- 開始時間が現在時刻より前
  ORDER BY start_at DESC             -- 現在時刻に最も近い（新しい）もの
  LIMIT 1;
  
  -- 適切なシーズンが見つからない場合
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_suitable_season',
      'message', '開始可能なシーズンが見つかりません。開始時間が現在時刻より前のupcomingシーズンが必要です。',
      'current_time', v_current_time
    );
  END IF;
  
  -- シーズンをアクティブ化
  UPDATE seasons 
  SET 
    status = 'active',
    updated_at = v_current_time
  WHERE id = v_target_season.id;
  
  -- 全ユーザーにシーズン開始通知を作成
  INSERT INTO notifications (user_id, title, message, type, related_season_id)
  SELECT 
    auth.users.id,
    '🎉 新シーズン開始！',
    v_target_season.name || ' が開始されました！新しいバトルにチャレンジしましょう！',
    'season_start',
    v_target_season.id
  FROM auth.users
  WHERE auth.users.id IN (SELECT id FROM profiles); -- プロフィールが存在するユーザーのみ
  
  -- 作成された通知数を取得
  GET DIAGNOSTICS v_user_count = ROW_COUNT;
  
  -- 成功レスポンス
  RETURN json_build_object(
    'success', true,
    'activated_season', json_build_object(
      'id', v_target_season.id,
      'name', v_target_season.name,
      'start_at', v_target_season.start_at,
      'end_at', v_target_season.end_at,
      'previous_status', 'upcoming',
      'activated_at', v_current_time
    ),
    'notifications_created', v_user_count,
    'message', 'シーズンが正常にアクティブ化され、' || v_user_count || '人のユーザーに通知が送信されました。'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生した場合
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'シーズンアクティブ化中にエラーが発生しました: ' || SQLERRM
    );
END;
$$;
