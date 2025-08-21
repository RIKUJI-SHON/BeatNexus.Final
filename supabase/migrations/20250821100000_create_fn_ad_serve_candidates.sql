-- Migration: create consolidated ad serve candidates function
-- Description: Provide a single RPC to fetch all candidate flights with impression counts (user-today + total)
-- Notes:
--  - This function intentionally does NOT filter by daily_cap / imp_goal so that the Edge Function can distinguish
--    between "no flights at all" (AD_NO_FILL) and "all flights filtered by caps" (AD_CAP_REACHED / goal reached).
--  - Targeting (country/language/device) is applied here for basic arrays in targeting_json. If targeting_json is malformed, the row is treated as a match (fails-open) consistent with current JS logic.
--  - Future: move more complex targeting or caching inside this function or wrap with a materialized view.

create or replace function public.ad_serve_candidates(
  p_placement_key text,
  p_user_id uuid default null,
  p_anon_id text default null,
  p_country text default null,
  p_language text default null,
  p_device text default null
) returns table (
  flight_id uuid,
  placement_id uuid,
  creative_id uuid,
  weight int,
  daily_cap int,
  imp_goal int,
  targeting_json jsonb,
  creative_headline text,
  creative_body text,
  creative_cta_text text,
  creative_file_url text,
  creative_target_url text,
  user_today_imps int,
  total_imps bigint
) language sql stable as $$
  with placement as (
    select id from ad_placements where key = p_placement_key and is_active = true limit 1
  ), base as (
    select f.id as flight_id,
           f.placement_id,
           c.id as creative_id,
           f.weight,
           f.daily_cap,
           f.imp_goal,
           f.targeting_json,
           cr.headline as creative_headline,
           cr.body as creative_body,
           cr.cta_text as creative_cta_text,
           cr.file_url as creative_file_url,
           cr.target_url as creative_target_url
    from placement p
    join ad_flights f on f.placement_id = p.id
    join ad_campaigns c on c.id = f.campaign_id
    join ad_creatives cr on cr.campaign_id = c.id
    where c.status = 'active'
      and current_date between c.start_date and c.end_date
      -- Basic targeting filters (fails-open if JSON missing/malformed)
      and (
        f.targeting_json is null
        or (
          (
            p_country is null
            or (f.targeting_json ? 'countries' = false)
            or (exists (
                 select 1 from jsonb_array_elements_text(f.targeting_json->'countries') t(val)
                 where lower(val) = lower(p_country)
               ))
          )
          and (
            p_language is null
            or (f.targeting_json ? 'languages' = false)
            or (exists (
                 select 1 from jsonb_array_elements_text(f.targeting_json->'languages') t(val)
                 where lower(val) = lower(p_language)
               ))
          )
          and (
            p_device is null
            or (f.targeting_json ? 'devices' = false)
            or (exists (
                 select 1 from jsonb_array_elements_text(f.targeting_json->'devices') t(val)
                 where lower(val) = lower(p_device)
               ))
          )
        )
      )
  ), user_imp as (
    select e.flight_id, count(*)::int as user_today_imps
    from ad_events e
    where e.type = 'impression'
      and e.flight_id in (select flight_id from base)
      and e.occurred_at >= date_trunc('day', now())
      and (
        (p_user_id is not null and e.user_id = p_user_id)
        or (p_user_id is null and p_anon_id is not null and e.anon_session_id = p_anon_id)
      )
    group by e.flight_id
  ), total_imp as (
    select e.flight_id, count(*)::bigint as total_imps
    from ad_events e
    where e.type = 'impression'
      and e.flight_id in (select flight_id from base)
    group by e.flight_id
  )
  select b.flight_id,
         b.placement_id,
         b.creative_id,
         b.weight,
         b.daily_cap,
         b.imp_goal,
         b.targeting_json,
         b.creative_headline,
         b.creative_body,
         b.creative_cta_text,
         b.creative_file_url,
         b.creative_target_url,
         coalesce(u.user_today_imps, 0) as user_today_imps,
         coalesce(t.total_imps, 0) as total_imps
  from base b
  left join user_imp u on u.flight_id = b.flight_id
  left join total_imp t on t.flight_id = b.flight_id;
$$;

comment on function public.ad_serve_candidates is 'Return candidate ad flights (already filtered by placement, campaign status/date, basic targeting) with per-user today & total impression counts. Filtering by caps left to caller.';
