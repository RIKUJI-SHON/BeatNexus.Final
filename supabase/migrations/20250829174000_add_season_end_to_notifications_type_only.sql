-- 20250829174000_add_season_end_to_notifications_type_only.sql
-- 目的: 本番の notifications.type 制約に 'season_end' を追加（既存タイプは維持）
-- 既存定義: info, success, warning, battle_matched, battle_win, battle_lose, battle_draw, season_start, news_article
-- 変更後   : 上記 + season_end

BEGIN;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (((type)::text = ANY (ARRAY[
    ('info'::character varying)::text,
    ('success'::character varying)::text,
    ('warning'::character varying)::text,
    ('battle_matched'::character varying)::text,
    ('battle_win'::character varying)::text,
    ('battle_lose'::character varying)::text,
    ('battle_draw'::character varying)::text,
    ('season_start'::character varying)::text,
    ('news_article'::character varying)::text,
    ('season_end'::character varying)::text
  ])));

COMMIT;
