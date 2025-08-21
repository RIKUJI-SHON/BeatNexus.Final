-- ads MVP core tables
-- Depends: none
-- Description: create advertisers, ad_campaigns, ad_creatives, ad_placements, ad_flights, ad_events

begin;

create table if not exists advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_info jsonb,
  billing_info jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references advertisers(id) on delete cascade,
  name text not null,
  objective text check (objective in ('awareness','application','traffic')),
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('draft','active','paused','ended')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint campaign_date_range check (end_date >= start_date)
);
create index if not exists ad_campaigns_advertiser_id_idx on ad_campaigns (advertiser_id);
create index if not exists ad_campaigns_status_idx on ad_campaigns (status);

create table if not exists ad_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references ad_campaigns(id) on delete cascade,
  type text not null check (type in ('image','video','article')),
  file_url text,
  headline text,
  body text,
  cta_text text,
  target_url text,
  dimensions text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists ad_creatives_campaign_id_idx on ad_creatives (campaign_id);

create table if not exists ad_placements (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  description text,
  size text,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists ad_placements_is_active_idx on ad_placements (is_active);

create table if not exists ad_flights (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references ad_campaigns(id) on delete cascade,
  placement_id uuid references ad_placements(id) on delete cascade,
  targeting_json jsonb,
  daily_cap int,
  imp_goal int,
  weight int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists ad_flights_campaign_placement_idx on ad_flights (campaign_id, placement_id);
create index if not exists ad_flights_targeting_json_idx on ad_flights using gin (targeting_json);

create table if not exists ad_events (
  id bigserial primary key,
  creative_id uuid references ad_creatives(id) on delete cascade,
  placement_id uuid references ad_placements(id) on delete restrict,
  flight_id uuid references ad_flights(id) on delete set null,
  type text not null check (type in ('impression','click')),
  user_id uuid,
  anon_session_id text,
  occurred_at timestamptz not null default now(),
  client_meta jsonb
);
create index if not exists ad_events_creative_type_time_idx on ad_events (creative_id, type, occurred_at);
create index if not exists ad_events_placement_time_idx on ad_events (placement_id, occurred_at);
create index if not exists ad_events_user_time_idx on ad_events (user_id, occurred_at);

commit;
