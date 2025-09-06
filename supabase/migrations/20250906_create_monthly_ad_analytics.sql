-- 月次広告分析用の包括的データ収集システム
begin;

-- 1. 月次集計マテリアライズドビュー
create materialized view if not exists public.mv_ad_stats_monthly as
select 
    date_trunc('month', occurred_at) as month_start,
    simple_ad_id,
    placement_id,
    flight_id,
    
    -- 基本指標
    count(*) filter (where type = 'impression') as impressions,
    count(*) filter (where type = 'click') as clicks,
    count(distinct user_id) filter (where type = 'impression' and user_id is not null) as unique_users_impressions,
    count(distinct user_id) filter (where type = 'click' and user_id is not null) as unique_users_clicks,
    count(distinct anon_session_id) filter (where type = 'impression' and user_id is null) as unique_anon_impressions,
    count(distinct anon_session_id) filter (where type = 'click' and user_id is null) as unique_anon_clicks,
    
    -- CTR計算
    case 
        when count(*) filter (where type = 'impression') > 0 
        then round((count(*) filter (where type = 'click')::numeric / count(*) filter (where type = 'impression')::numeric) * 100, 4)
        else 0 
    end as ctr_percentage,
    
    -- 時系列パフォーマンス指標
    count(*) filter (where type = 'impression' and extract(hour from occurred_at) between 9 and 17) as impressions_business_hours,
    count(*) filter (where type = 'click' and extract(hour from occurred_at) between 9 and 17) as clicks_business_hours,
    count(*) filter (where type = 'impression' and extract(dow from occurred_at) in (1,2,3,4,5)) as impressions_weekdays,
    count(*) filter (where type = 'click' and extract(dow from occurred_at) in (1,2,3,4,5)) as clicks_weekdays,
    
    -- デバイス・プラットフォーム分析（client_metaから）
    count(*) filter (where type = 'impression' and (client_meta->>'mobile')::boolean = true) as impressions_mobile,
    count(*) filter (where type = 'click' and (client_meta->>'mobile')::boolean = true) as clicks_mobile,
    
    -- 統計的信頼性指標
    case 
        when count(*) filter (where type = 'impression') >= 1000 then 'high'
        when count(*) filter (where type = 'impression') >= 100 then 'medium'
        when count(*) filter (where type = 'impression') >= 30 then 'low'
        else 'insufficient'
    end as statistical_confidence,
    
    -- 最初と最後のイベント時刻
    min(occurred_at) as first_event_at,
    max(occurred_at) as last_event_at,
    
    -- 集計生成時刻
    now() as calculated_at
    
from public.ad_events 
where occurred_at >= date_trunc('month', current_date - interval '12 months')
group by 
    date_trunc('month', occurred_at),
    simple_ad_id,
    placement_id,
    flight_id;

-- インデックス作成
create unique index if not exists mv_ad_stats_monthly_unique_idx 
    on public.mv_ad_stats_monthly(month_start, simple_ad_id, placement_id, flight_id);
create index if not exists mv_ad_stats_monthly_month_idx 
    on public.mv_ad_stats_monthly(month_start);
create index if not exists mv_ad_stats_monthly_ctr_idx 
    on public.mv_ad_stats_monthly(ctr_percentage);

-- 2. 月次集計リフレッシュ関数
create or replace function public.refresh_mv_ad_stats_monthly()
returns text
language plpgsql
security definer
as $$
declare
    refresh_start timestamptz;
    refresh_end timestamptz;
    affected_rows bigint;
begin
    refresh_start := now();
    
    -- マテビューリフレッシュ
    refresh materialized view concurrently public.mv_ad_stats_monthly;
    
    refresh_end := now();
    
    -- 実行ログ
    get diagnostics affected_rows = row_count;
    
    return format('Monthly stats refreshed: %s rows, duration: %s', 
                  affected_rows, 
                  refresh_end - refresh_start);
end;
$$;

-- 3. 月次パフォーマンス比較ビュー
create or replace view public.vw_monthly_performance_trends as
select 
    month_start,
    simple_ad_id,
    placement_id,
    
    -- 当月指標
    impressions,
    clicks,
    ctr_percentage,
    
    -- 前月比較
    lag(impressions) over (partition by simple_ad_id, placement_id order by month_start) as prev_month_impressions,
    lag(clicks) over (partition by simple_ad_id, placement_id order by month_start) as prev_month_clicks,
    lag(ctr_percentage) over (partition by simple_ad_id, placement_id order by month_start) as prev_month_ctr,
    
    -- 成長率計算
    case 
        when lag(impressions) over (partition by simple_ad_id, placement_id order by month_start) > 0
        then round(((impressions::numeric / lag(impressions) over (partition by simple_ad_id, placement_id order by month_start)::numeric) - 1) * 100, 2)
        else null
    end as impressions_growth_rate,
    
    case 
        when lag(ctr_percentage) over (partition by simple_ad_id, placement_id order by month_start) > 0
        then round(ctr_percentage - lag(ctr_percentage) over (partition by simple_ad_id, placement_id order by month_start), 4)
        else null
    end as ctr_change_points,
    
    -- 年間移動平均
    avg(ctr_percentage) over (
        partition by simple_ad_id, placement_id 
        order by month_start 
        rows between 11 preceding and current row
    ) as ctr_12month_avg,
    
    statistical_confidence,
    unique_users_impressions + unique_anon_impressions as total_unique_views
    
from public.mv_ad_stats_monthly
order by month_start desc, ctr_percentage desc;

-- 4. アラート検知関数
create or replace function public.detect_ad_performance_anomalies(
    lookback_months integer default 3
)
returns table (
    alert_type text,
    simple_ad_id uuid,
    placement_id uuid,
    current_month date,
    metric_name text,
    current_value numeric,
    expected_range_min numeric,
    expected_range_max numeric,
    severity text
)
language plpgsql
security definer
as $$
declare
    analysis_start date;
begin
    analysis_start := date_trunc('month', current_date - interval '1 month' * lookback_months);
    
    -- CTR異常検知（標準偏差ベース）
    return query
    with monthly_stats as (
        select 
            m.simple_ad_id,
            m.placement_id,
            m.month_start,
            m.ctr_percentage,
            m.impressions,
            avg(m.ctr_percentage) over (partition by m.simple_ad_id, m.placement_id) as avg_ctr,
            stddev(m.ctr_percentage) over (partition by m.simple_ad_id, m.placement_id) as stddev_ctr
        from public.mv_ad_stats_monthly m
        where m.month_start >= analysis_start
        and m.statistical_confidence in ('medium', 'high')
    ),
    anomalies as (
        select 
            simple_ad_id,
            placement_id,
            month_start,
            ctr_percentage,
            avg_ctr,
            stddev_ctr,
            case 
                when abs(ctr_percentage - avg_ctr) > 2 * stddev_ctr then 'critical'
                when abs(ctr_percentage - avg_ctr) > 1.5 * stddev_ctr then 'warning'
                else 'normal'
            end as anomaly_level
        from monthly_stats
        where stddev_ctr > 0
    )
    select 
        'ctr_anomaly'::text,
        a.simple_ad_id,
        a.placement_id,
        a.month_start::date,
        'ctr_percentage'::text,
        a.ctr_percentage,
        (a.avg_ctr - 2 * a.stddev_ctr),
        (a.avg_ctr + 2 * a.stddev_ctr),
        a.anomaly_level
    from anomalies a
    where a.anomaly_level != 'normal'
    and a.month_start = date_trunc('month', current_date - interval '1 month')
    order by 
        case a.anomaly_level when 'critical' then 1 when 'warning' then 2 else 3 end,
        a.ctr_percentage desc;
end;
$$;

-- 5. 月次レポート生成関数
create or replace function public.generate_monthly_ad_report(
    target_month date default date_trunc('month', current_date - interval '1 month')
)
returns table (
    section text,
    metric text,
    value text,
    context text
)
language plpgsql
security definer
as $$
declare
    total_impressions bigint;
    total_clicks bigint;
    overall_ctr numeric;
    top_performing_ad uuid;
    worst_performing_ad uuid;
    month_name text;
begin
    month_name := to_char(target_month, 'YYYY-MM');
    
    -- 全体サマリ
    select 
        sum(impressions), 
        sum(clicks),
        case when sum(impressions) > 0 then round((sum(clicks)::numeric / sum(impressions)::numeric) * 100, 4) else 0 end
    into total_impressions, total_clicks, overall_ctr
    from public.mv_ad_stats_monthly 
    where month_start = target_month;
    
    -- トップパフォーマンス広告
    select simple_ad_id into top_performing_ad
    from public.mv_ad_stats_monthly 
    where month_start = target_month 
    and statistical_confidence in ('medium', 'high')
    order by ctr_percentage desc, impressions desc 
    limit 1;
    
    -- ワーストパフォーマンス広告
    select simple_ad_id into worst_performing_ad
    from public.mv_ad_stats_monthly 
    where month_start = target_month 
    and statistical_confidence in ('medium', 'high')
    order by ctr_percentage asc, impressions desc 
    limit 1;
    
    -- レポート出力
    return query
    select 'summary'::text, 'total_impressions'::text, total_impressions::text, month_name::text
    union all
    select 'summary'::text, 'total_clicks'::text, total_clicks::text, month_name::text
    union all
    select 'summary'::text, 'overall_ctr'::text, overall_ctr::text || '%', month_name::text
    union all
    select 'performance'::text, 'top_performing_ad'::text, top_performing_ad::text, 'highest_ctr'::text
    union all
    select 'performance'::text, 'worst_performing_ad'::text, worst_performing_ad::text, 'lowest_ctr'::text;
    
end;
$$;

-- 権限設定
grant select on public.mv_ad_stats_monthly to authenticated;
grant select on public.vw_monthly_performance_trends to authenticated;
grant execute on function public.refresh_mv_ad_stats_monthly() to authenticated;
grant execute on function public.detect_ad_performance_anomalies(integer) to authenticated;
grant execute on function public.generate_monthly_ad_report(date) to authenticated;

commit;
