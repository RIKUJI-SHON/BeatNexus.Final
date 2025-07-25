-- 投稿関数最終修正マイグレーション
-- 作成日: 2025年7月25日18:30
-- 機能: battle_format型キャストエラーとその他の問題を修正

-- 完全に修正されたcreate_submission_with_cooldown_check関数
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
  
  -- 1時間制限をチェック
  SELECT created_at INTO last_submission_time
  FROM submissions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour'
    AND status != 'withdrawn'
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

  -- 投稿を作成（型キャストエラーを回避）
  INSERT INTO submissions (
    user_id, 
    video_url, 
    battle_format, 
    created_at,
    status
  ) VALUES (
    p_user_id, 
    p_video_url, 
    valid_battle_format,  -- 型キャストを削除
    NOW(),
    'WAITING_OPPONENT'
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
COMMENT ON FUNCTION public.create_submission_with_cooldown_check(uuid, text, text) IS '1時間制限チェック付き投稿作成関数（最終修正版）：型キャストエラーとバリデーション問題を修正';
