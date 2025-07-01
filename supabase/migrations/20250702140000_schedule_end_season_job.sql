-- ============================================================================
-- pg_cron: シーズン自動終了ジョブのスケジュール登録
-- ============================================================================

-- end_current_season() 関数を毎日深夜 00:05 (UTC) に実行するジョブを登録します。
-- このジョブは、シーズンの end_at を過ぎていないかチェックし、
-- 過ぎていればランキングを確定し、ポイントをリセットして次シーズンに移行します。

SELECT cron.schedule(
    'end-of-season-processing', -- ジョブ名（ユニーク）
    '5 0 * * *',                -- 毎日 00:05 (UTC)
    $$ SELECT public.end_current_season(); $$
);

-- コメント追加
COMMENT ON EXTENSION pg_cron IS 'Used for scheduling periodic jobs like season processing and matchmaking.'; 