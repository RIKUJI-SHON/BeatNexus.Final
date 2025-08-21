-- Minimal click logging helper (lightweight path)\n-- Description: function + permissive policy via security definer to allow controlled click inserts without full serve/impression system\n-- Depends: 20250821_create_ad_core_tables.sql, 20250821_add_ad_rls_policies.sql\n\nbegin;\n\n-- 1. Lightweight insert function (security definer)\ncreate or replace function public.log_ad_click_minimal(
  p_creative_id uuid,
  p_placement_key text,
  p_flight_id uuid default null,
  p_anon_session_id text default null,
  p_user_id uuid default null,
  p_client_meta jsonb default '{}'::jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_placement_id uuid;
  v_event_id bigint;
begin
  -- resolve placement id (fail fast if not exists)
  select id into v_placement_id from ad_placements where key = p_placement_key and is_active limit 1;
  if v_placement_id is null then
    raise exception 'placement_not_found';
  end if;

  insert into ad_events(creative_id, placement_id, flight_id, type, user_id, anon_session_id, client_meta)
  values (p_creative_id, v_placement_id, p_flight_id, 'click', p_user_id, p_anon_session_id, p_client_meta)
  returning id into v_event_id;

  return v_event_id;
end;$$;

comment on function public.log_ad_click_minimal is 'Lightweight click logger for early phase (no impression dependency). Will be deprecated once full tracking pipeline stabilizes.';

-- 2. Grant execute to anon & authenticated so Edge or client (if whitelisted) can call (still consider wrapping via Edge)
grant execute on function public.log_ad_click_minimal(uuid, text, uuid, text, uuid, jsonb) to anon, authenticated;

commit;\n
