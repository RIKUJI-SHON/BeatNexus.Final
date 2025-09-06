-- Migration: Alter ad_events to align with simplified simple_ads model
-- Date: 2025-09-06
-- Purpose: Replace legacy creative_id (ad_creatives) reference with simple_ad_id (simple_ads)
-- Preconditions: ad_events table exists and either has no data or data may safely map 1:1 to simple_ads (currently empty)
-- Notes: No backfill required (legacy tracking disabled). If rollback needed, recreate column creative_id referencing ad_creatives.

begin;

-- Drop old FK & index if present
alter table public.ad_events drop constraint if exists ad_events_creative_id_fkey;
drop index if exists ad_events_creative_type_time_idx;

-- Rename column
alter table public.ad_events rename column creative_id to simple_ad_id;

-- Add new FK to simple_ads
alter table public.ad_events
  add constraint ad_events_simple_ad_id_fkey foreign key (simple_ad_id)
  references public.simple_ads(id) on delete set null;

-- Recreate composite index with new column name
create index if not exists ad_events_simple_ad_type_time_idx
  on public.ad_events(simple_ad_id, type, occurred_at);

comment on column public.ad_events.simple_ad_id is 'FK to simple_ads (simplified ad model)';

commit;
