-- シーズンオフ機能実装マイグレーション
-- 作成日: 2025-07-20
-- 機能: シーズンオフ期間の投稿制限とステータス確認

-- 投稿可能かどうかを確認する関数
CREATE OR REPLACE FUNCTION can_submit_video()
RETURNS boolean AS $$
DECLARE
  active_season_count integer;
  season_ending_soon boolean := false;
BEGIN
  -- アクティブなシーズンの数を確認
  SELECT COUNT(*) INTO active_season_count
  FROM seasons 
  WHERE status = 'active';
  
  -- アクティブなシーズンが存在しない場合は投稿不可
  IF active_season_count = 0 THEN
    RETURN false;
  END IF;
  
  -- シーズン終了5日前かどうかを確認
  SELECT EXISTS(
    SELECT 1 FROM seasons 
    WHERE status = 'active' 
    AND end_at <= (CURRENT_TIMESTAMP + INTERVAL '5 days')
  ) INTO season_ending_soon;
  
  -- シーズン終了5日前の場合は投稿不可
  IF season_ending_soon THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 投稿ステータスの詳細情報を取得する関数
CREATE OR REPLACE FUNCTION get_submission_status()
RETURNS json AS $$
DECLARE
  result json;
  active_season_count integer;
  season_ending_soon boolean := false;
  next_season_start_date timestamp;
  active_season_info json;
BEGIN
  -- アクティブなシーズンの数を確認
  SELECT COUNT(*) INTO active_season_count
  FROM seasons 
  WHERE status = 'active';
  
  -- アクティブなシーズン情報を取得
  SELECT row_to_json(t) INTO active_season_info
  FROM (
    SELECT id, name, end_at
    FROM seasons 
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  ) t;
  
  -- 次のシーズンの開始日を取得
  SELECT start_at INTO next_season_start_date
  FROM seasons 
  WHERE status = 'upcoming'
  ORDER BY start_at ASC
  LIMIT 1;
  
  -- シーズン終了5日前かどうかを確認
  SELECT EXISTS(
    SELECT 1 FROM seasons 
    WHERE status = 'active' 
    AND end_at <= (CURRENT_TIMESTAMP + INTERVAL '5 days')
  ) INTO season_ending_soon;
  
  -- アクティブなシーズンが存在しない場合
  IF active_season_count = 0 THEN
    result := json_build_object(
      'can_submit', false,
      'reason', 'SEASON_OFF',
      'next_season_start_date', next_season_start_date,
      'active_season', null
    );
  -- シーズン終了5日前の場合
  ELSIF season_ending_soon THEN
    result := json_build_object(
      'can_submit', false,
      'reason', 'ENDING_SOON',
      'next_season_start_date', next_season_start_date,
      'active_season', active_season_info
    );
  -- 投稿可能な場合
  ELSE
    result := json_build_object(
      'can_submit', true,
      'reason', null,
      'next_season_start_date', next_season_start_date,
      'active_season', active_season_info
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 既存のcreate_submission_with_cooldown_check関数を修正
CREATE OR REPLACE FUNCTION create_submission_with_cooldown_check(
  p_user_id uuid,
  p_video_url text,
  p_battle_format text
)
RETURNS json AS $$
DECLARE
  last_submission_time timestamp;
  can_submit_now boolean;
  cooldown_remaining interval;
  new_submission_id uuid;
  result json;
BEGIN
  -- シーズン制限をチェック
  SELECT can_submit_video() INTO can_submit_now;
  
  IF NOT can_submit_now THEN
    RETURN json_build_object(
      'success', false,
      'error', 'season_restriction',
      'message', 'シーズン制限により投稿できません。'
    );
  END IF;
  
  -- 24時間制限をチェック
  SELECT created_at INTO last_submission_time
  FROM submissions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours'
    AND status != 'withdrawn'
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_submission_time IS NOT NULL THEN
    cooldown_remaining := (last_submission_time + INTERVAL '24 hours') - NOW();
    
    IF cooldown_remaining > INTERVAL '0' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'cooldown_active',
        'message', format('24時間以内に投稿できるのは1本までです。次回投稿可能まで: %s', 
          CASE 
            WHEN EXTRACT(EPOCH FROM cooldown_remaining) >= 3600 THEN
              format('%s時間%s分', 
                FLOOR(EXTRACT(EPOCH FROM cooldown_remaining) / 3600),
                FLOOR((EXTRACT(EPOCH FROM cooldown_remaining) % 3600) / 60)
              )
            ELSE
              format('%s分', CEIL(EXTRACT(EPOCH FROM cooldown_remaining) / 60))
          END
        ),
        'remaining_seconds', EXTRACT(EPOCH FROM cooldown_remaining)
      );
    END IF;
  END IF;

  -- 投稿を作成
  INSERT INTO submissions (user_id, video_url, battle_format, status)
  VALUES (p_user_id, p_video_url, p_battle_format, 'waiting')
  RETURNING id INTO new_submission_id;

  RETURN json_build_object(
    'success', true,
    'submission_id', new_submission_id,
    'message', '投稿が正常に作成されました。'
  );
END;
$$ LANGUAGE plpgsql;
