-- RLS policies for ad-related tables (MVP)
begin;
create or replace function public.app_role() returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', 'end_user');
$$;
alter table advertisers enable row level security;
alter table ad_campaigns enable row level security;
alter table ad_creatives enable row level security;
alter table ad_placements enable row level security;
alter table ad_flights enable row level security;
alter table ad_events enable row level security;
create policy advertisers_select on advertisers for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy advertisers_modify on advertisers for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));
create policy ad_campaigns_select on ad_campaigns for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy ad_campaigns_modify on ad_campaigns for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));
create policy ad_creatives_select on ad_creatives for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy ad_creatives_modify on ad_creatives for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));
create policy ad_placements_select on ad_placements for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy ad_placements_modify on ad_placements for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));
create policy ad_flights_select on ad_flights for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy ad_flights_modify on ad_flights for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));
create policy ad_events_select on ad_events for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy ad_events_insert on ad_events for insert with check (app_role() in ('internal_admin','ad_ops'));
commit;
