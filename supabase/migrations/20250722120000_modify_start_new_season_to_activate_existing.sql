-- ✅ シーズン開始処理修正: 新規作成から既存シーズンアクティブ化へ
-- 日付: 2025-07-22
-- 環境: 開発環境 (wdttluticnlqzmqmfvgt)
-- 目的: start_new_season()を既存の非アクティブシーズンをアクティブ化する方式に変更
-- 変更内容: 新規シーズン作成を停止し、適切な既存シーズンを探してアクティブ化

-- 既存の関数を削除
DROP FUNCTION IF EXISTS start_new_season(TEXT, INTEGER);

-- 修正版の関数を作成 (パラメータなし)
CREATE OR REPLACE FUNCTION start_new_season()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_active_season RECORD;
  v_target_season RECORD;
  v_current_time TIMESTAMPTZ := NOW();
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

  -- 対象シーズンをアクティブに更新
  UPDATE seasons 
  SET 
    status = 'active',
    updated_at = NOW()
  WHERE id = v_target_season.id;

  RETURN json_build_object(
    'success', true,
    'activated_season', json_build_object(
      'id', v_target_season.id,
      'name', v_target_season.name,
      'start_at', v_target_season.start_at,
      'end_at', v_target_season.end_at,
      'previous_status', v_target_season.status,
      'activated_at', NOW()
    ),
    'message', 'シーズンが正常にアクティブ化されました。'
  );
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION start_new_season() TO authenticated;

-- コメント追加
COMMENT ON FUNCTION start_new_season() IS 'シーズン開始処理：upcomingシーズンから適切なものを選択してアクティブ化（endedシーズンは対象外）';
