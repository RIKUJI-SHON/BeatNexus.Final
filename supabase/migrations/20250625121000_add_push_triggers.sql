-- 🛎️ Push Notification System - Database Triggers
-- 各イベント発生時にEdge Functionを呼び出すトリガーを設定

-- ヘルパー関数: Edge Function呼び出し用
CREATE OR REPLACE FUNCTION call_edge_function(
  function_name text,
  payload jsonb
) RETURNS void AS $$
DECLARE
  edge_function_url text;
  response_status int;
BEGIN
  -- Edge Function のURL を構築
  edge_function_url := current_setting('app.edge_function_base_url', true);
  IF edge_function_url IS NULL OR edge_function_url = '' THEN
    -- デフォルトのSupabase Edge FunctionsのURL形式
    edge_function_url := 'https://' || current_setting('app.project_ref', true) || '.supabase.co/functions/v1/';
  END IF;
  
  edge_function_url := edge_function_url || function_name;

  -- HTTP POST でEdge Functionを呼び出し
  -- NOTE: これは非同期実行のため、エラーが発生してもトリガー自体は成功とする
  BEGIN
    SELECT status INTO response_status
    FROM http_post(
      edge_function_url,
      payload::text,
      'application/json',
      ARRAY[
        http_header('Authorization', 'Bearer ' || current_setting('app.service_role_key', true)),
        http_header('Content-Type', 'application/json')
      ]
    );
    
    -- ログ出力（本番環境では必要に応じてコメントアウト）
    RAISE LOG 'Called edge function % with status %', function_name, response_status;
    
  EXCEPTION WHEN OTHERS THEN
    -- エラーが発生してもトリガー処理は継続
    RAISE LOG 'Failed to call edge function %: %', function_name, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント
COMMENT ON FUNCTION call_edge_function(text, jsonb) IS 'Edge Functionを非同期で呼び出すヘルパー関数';

-- 1. バトル成立時の通知トリガー
CREATE OR REPLACE FUNCTION notify_battle_created_trigger()
RETURNS trigger AS $$
BEGIN
  -- バトルが新しくACTIVEステータスになった場合のみ
  IF NEW.status = 'ACTIVE' AND (OLD IS NULL OR OLD.status != 'ACTIVE') THEN
    PERFORM call_edge_function(
      'notify-battle-created',
      jsonb_build_object('battle_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- バトルテーブルにトリガーを設定
DROP TRIGGER IF EXISTS trigger_notify_battle_created ON battles;
CREATE TRIGGER trigger_notify_battle_created
  AFTER INSERT OR UPDATE ON battles
  FOR EACH ROW
  EXECUTE FUNCTION notify_battle_created_trigger();

COMMENT ON FUNCTION notify_battle_created_trigger() IS 'バトルが成立(ACTIVE)した時にプッシュ通知を送信';

-- 2. 投票発生時の通知トリガー
CREATE OR REPLACE FUNCTION notify_vote_cast_trigger()
RETURNS trigger AS $$
BEGIN
  -- 新しい投票が追加された場合
  PERFORM call_edge_function(
    'notify-vote-cast',
    jsonb_build_object(
      'battle_id', NEW.battle_id,
      'voter_id', NEW.voter_id,
      'voted_user_id', NEW.voted_user_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 投票テーブルにトリガーを設定
DROP TRIGGER IF EXISTS trigger_notify_vote_cast ON votes;
CREATE TRIGGER trigger_notify_vote_cast
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION notify_vote_cast_trigger();

COMMENT ON FUNCTION notify_vote_cast_trigger() IS '投票が行われた時にプッシュ通知を送信';

-- 3. バトル結果確定時の通知トリガー
CREATE OR REPLACE FUNCTION notify_battle_completed_trigger()
RETURNS trigger AS $$
BEGIN
  -- バトルがCOMPLETEDステータスになった場合
  IF NEW.status = 'COMPLETED' AND (OLD IS NULL OR OLD.status != 'COMPLETED') THEN
    PERFORM call_edge_function(
      'notify-battle-completed',
      jsonb_build_object('battle_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- バトルテーブルに結果確定トリガーを設定
DROP TRIGGER IF EXISTS trigger_notify_battle_completed ON battles;
CREATE TRIGGER trigger_notify_battle_completed
  AFTER UPDATE ON battles
  FOR EACH ROW
  EXECUTE FUNCTION notify_battle_completed_trigger();

COMMENT ON FUNCTION notify_battle_completed_trigger() IS 'バトルが完了(COMPLETED)した時にプッシュ通知を送信';

-- 設定用のテーブル（Edge Function URLなどの設定を保存）
CREATE TABLE IF NOT EXISTS push_notification_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- デフォルト設定を挿入
INSERT INTO push_notification_config (key, value, description) VALUES
  ('edge_function_base_url', '', 'Edge FunctionのベースURL（空の場合はデフォルトを使用）'),
  ('service_role_key', '', 'Service Role Key（セキュリティ上、別途設定）'),
  ('project_ref', '', 'Supabaseプロジェクト参照ID')
ON CONFLICT (key) DO NOTHING;

-- 設定テーブルの権限（管理者のみアクセス可能）
ALTER TABLE push_notification_config ENABLE ROW LEVEL SECURITY;

-- 管理者用ポリシー（service roleのみアクセス可能）
CREATE POLICY "Service role can manage push config" ON push_notification_config
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE push_notification_config IS 'プッシュ通知システムの設定値を保存';

-- 権限付与
GRANT SELECT ON push_notification_config TO service_role;
GRANT INSERT, UPDATE, DELETE ON push_notification_config TO service_role;

-- 設定更新関数（管理用）
CREATE OR REPLACE FUNCTION update_push_config(
  config_key text,
  config_value text
) RETURNS void AS $$
BEGIN
  INSERT INTO push_notification_config (key, value, updated_at)
  VALUES (config_key, config_value, now())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_push_config(text, text) IS 'プッシュ通知設定を更新する管理用関数';

-- ログ出力用関数（デバッグ時に使用）
CREATE OR REPLACE FUNCTION log_push_trigger_event(
  event_type text,
  event_data jsonb
) RETURNS void AS $$
BEGIN
  RAISE LOG 'Push notification trigger: % - Data: %', event_type, event_data;
END;
$$ LANGUAGE plpgsql;

-- 設定値の取得を簡単にするビュー
CREATE OR REPLACE VIEW push_config_view AS
SELECT 
  key,
  value,
  description,
  updated_at
FROM push_notification_config;

COMMENT ON VIEW push_config_view IS 'プッシュ通知設定の読み取り用ビュー'; 