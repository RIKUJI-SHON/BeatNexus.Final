-- Migration: add related_site_news_id to notifications for linking news articles
-- Description: Enables notification click to open a specific site_news article modal.
-- Apply order: dev first (wdttluticnlqzmqmfvgt) then prod after verification.

alter table public.notifications
  add column if not exists related_site_news_id uuid references public.site_news(id) on delete set null;

create index if not exists idx_notifications_related_site_news on public.notifications(related_site_news_id);
