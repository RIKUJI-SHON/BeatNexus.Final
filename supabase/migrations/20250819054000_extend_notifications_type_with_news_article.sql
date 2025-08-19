-- Extend notifications type constraint to include 'news_article'
-- Assumes notifications.type is varchar with a CHECK constraint notifications_type_check
-- Recreate constraint safely.

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('info','success','warning','battle_matched','battle_win','battle_lose','battle_draw','season_start','news_article'));
