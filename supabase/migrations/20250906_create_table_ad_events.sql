-- Migration: create ad_events table (reintroduced for impression & click tracking)
-- Depends on existing ad_creatives, ad_flights, ad_placements tables
-- Generated: 2025-09-06
begin;

create table if not exists public.ad_events (
  id              bigserial primary key,
  occurred_at     timestamptz not null default now(),
  type            text not null check (type in ('impression','click')),
  creative_id     uuid references public.ad_creatives(id) on delete set null,
  flight_id       uuid references public.ad_flights(id) on delete set null,
  placement_id    uuid references public.ad_placements(id) on delete set null,
  user_id         uuid references public.profiles(id) on delete set null,
  anon_session_id text,
  client_meta     jsonb,
  constraint ad_events_user_or_anon check ((user_id is not null) or (anon_session_id is not null))
);

create index if not exists ad_events_occurred_at_idx on public.ad_events(occurred_at);
create index if not exists ad_events_creative_type_time_idx on public.ad_events(creative_id, type, occurred_at);
create index if not exists ad_events_placement_time_idx on public.ad_events(placement_id, occurred_at);
create index if not exists ad_events_user_time_idx on public.ad_events(user_id, occurred_at);

-- Enable RLS (policies may already exist historically; recreate minimally)
alter table public.ad_events enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='ad_events' and policyname='ad_events_select_roles'
  ) then
    create policy ad_events_select_roles on public.ad_events
      for select to authenticated using ( auth.jwt() ->> 'app_role' in ('viewer','ad_ops','internal_admin') );
  end if;
end $$;

comment on table public.ad_events is 'Ad tracking raw events (impression & click)';
comment on column public.ad_events.client_meta is 'Client supplied metadata (viewport size, version etc.)';

commit;