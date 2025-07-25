-- submission_status enum値修正マイグレーション
-- 作成日: 2025年7月25日19:00
-- 機能: 関数内でのenum値を正しい大文字形式に修正

-- 修正されたcreate_submission_with_cooldown_check関数
CREATE OR REPLACE FUNCTION public.create_submission_with_cooldown_check(
  p_user_id uuid,
  p_video_url text,
  p_battle_format text
)
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_submission_time timestamp;
  can_submit_now boolean;
  cooldown_remaining interval;
  new_submission_id uuid;
  remaining_minutes integer;
  valid_battle_format text;
BEGIN
  -- バトルフォーマットの検証と正規化
  valid_battle_format := UPPER(p_battle_format);
  IF valid_battle_format NOT IN ('MAIN_BATTLE', 'MINI_BATTLE', 'THEME_CHALLENGE') THEN
    valid_battle_format := 'MAIN_BATTLE'; -- デフォルト値
  END IF;

  -- シーズン制限をチェック
  SELECT can_submit_video() INTO can_submit_now;
  
  IF NOT can_submit_now THEN
    RETURN json_build_object(
      'success', false,
      'error', 'season_restriction',
      'message_key', 'submission.error.seasonRestriction',
      'message_params', json_build_object()
    );
  END IF;
  
  -- 1時間制限をチェック（正しいenum値を使用）
  SELECT created_at INTO last_submission_time
  FROM submissions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour'
    AND status != 'WITHDRAWN'::submission_status  -- 正しいenum値を使用
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_submission_time IS NOT NULL THEN
    cooldown_remaining := (last_submission_time + INTERVAL '1 hour') - NOW();
    
    IF cooldown_remaining > INTERVAL '0' THEN
      remaining_minutes := CEIL(EXTRACT(EPOCH FROM cooldown_remaining) / 60);
      
      RETURN json_build_object(
        'success', false,
        'error', 'cooldown_active',
        'message_key', 'submission.error.cooldownActive',
        'message_params', json_build_object(
          'hours', FLOOR(EXTRACT(EPOCH FROM cooldown_remaining) / 3600),
          'minutes', FLOOR((EXTRACT(EPOCH FROM cooldown_remaining) % 3600) / 60),
          'totalMinutes', remaining_minutes
        ),
        'remaining_seconds', EXTRACT(EPOCH FROM cooldown_remaining)
      );
    END IF;
  END IF;

  -- 投稿を作成
  INSERT INTO submissions (
    user_id, 
    video_url, 
    battle_format, 
    status,
    created_at,
    updated_at
  ) VALUES (
    p_user_id, 
    p_video_url, 
    valid_battle_format::battle_format,
    'WAITING_OPPONENT'::submission_status,  -- 正しいenum値を使用
    NOW(),
    NOW()
  ) RETURNING id INTO new_submission_id;

  RETURN json_build_object(
    'success', true,
    'submission_id', new_submission_id,
    'message_key', 'submission.success.created',
    'message_params', json_build_object()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'submission_error',
      'message_key', 'submission.error.creationFailed',
      'message_params', json_build_object('error', SQLERRM, 'detail', SQLSTATE)
    );
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION public.create_submission_with_cooldown_check(uuid, text, text) TO authenticated;

-- コメント
COMMENT ON FUNCTION public.create_submission_with_cooldown_check(uuid, text, text) IS '1時間制限チェック付き投稿作成関数（enum値修正版）：正しいenum値を使用して投稿を作成';
