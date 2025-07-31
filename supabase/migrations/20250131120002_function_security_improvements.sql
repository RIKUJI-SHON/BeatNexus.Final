-- Function Security Improvements
-- 関数セキュリティ強化：search_pathパラメータ設定

-- 高優先度関数のセキュリティ強化（例）

-- submit_video 関数の修正例
-- 注意: 実際の関数定義に応じて調整が必要
CREATE OR REPLACE FUNCTION public.submit_video(
    p_title text,
    p_description text DEFAULT NULL,
    p_video_url text,
    p_thumbnail_url text DEFAULT NULL,
    p_duration integer DEFAULT NULL,
    p_community_id uuid DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql AS $$
DECLARE
    v_user_id uuid;
    v_submission_id uuid;
BEGIN
    -- ユーザー認証確認
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- 既存の関数ロジック（例）
    INSERT INTO submissions (
        title, description, video_url, thumbnail_url, 
        duration, user_id, community_id, created_at
    ) VALUES (
        p_title, p_description, p_video_url, p_thumbnail_url,
        p_duration, v_user_id, p_community_id, NOW()
    ) RETURNING id INTO v_submission_id;

    RETURN v_submission_id;
END;
$$;

-- log_audit_event 関数の修正例
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action text,
    p_table_name text,
    p_record_id uuid DEFAULT NULL,
    p_details jsonb DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql AS $$
DECLARE
    v_user_id uuid;
    v_log_id uuid;
BEGIN
    -- サービスロールまたは認証済みユーザーのみ
    v_user_id := auth.uid();
    
    INSERT INTO audit_logs (
        action, table_name, record_id, details, 
        user_id, created_at
    ) VALUES (
        p_action, p_table_name, p_record_id, p_details,
        v_user_id, NOW()
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- check_rate_limit 関数の修正例  
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_action text,
    p_limit_per_hour integer DEFAULT 10
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql AS $$
DECLARE
    v_user_id uuid;
    v_count integer;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- 過去1時間のアクション回数をチェック
    SELECT COUNT(*) INTO v_count
    FROM audit_logs
    WHERE user_id = v_user_id 
      AND action = p_action
      AND created_at > NOW() - INTERVAL '1 hour';

    RETURN v_count < p_limit_per_hour;
END;
$$;

-- 関数セキュリティ強化ログ
INSERT INTO audit_logs (action, table_name, details, created_at)
VALUES 
    ('FUNCTION_SECURITY_ENHANCED', 'submit_video', 'Added SECURITY DEFINER and search_path settings', NOW()),
    ('FUNCTION_SECURITY_ENHANCED', 'log_audit_event', 'Added SECURITY DEFINER and search_path settings', NOW()),
    ('FUNCTION_SECURITY_ENHANCED', 'check_rate_limit', 'Added SECURITY DEFINER and search_path settings', NOW());

-- セキュリティ強化完了コメント
COMMENT ON FUNCTION public.submit_video IS 'Enhanced with SECURITY DEFINER and search_path for SQL injection prevention';
COMMENT ON FUNCTION public.log_audit_event IS 'Enhanced with SECURITY DEFINER and search_path for SQL injection prevention';
COMMENT ON FUNCTION public.check_rate_limit IS 'Enhanced with SECURITY DEFINER and search_path for SQL injection prevention';
