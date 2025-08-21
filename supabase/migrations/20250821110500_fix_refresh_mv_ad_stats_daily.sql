-- Migration: fix refresh function to non-concurrent due to lack of unique index
begin;
create or replace function public.refresh_mv_ad_stats_daily()
returns table (refreshed boolean, rows int) language plpgsql security definer set search_path = public as $$
declare
  v_after int;
begin
  refresh materialized view mv_ad_stats_daily;
  select count(*) into v_after from mv_ad_stats_daily;
  return query select true as refreshed, v_after as rows;
end;$$;
comment on function public.refresh_mv_ad_stats_daily is 'Refresh mv_ad_stats_daily (non-concurrent) and return row count.';
commit;
