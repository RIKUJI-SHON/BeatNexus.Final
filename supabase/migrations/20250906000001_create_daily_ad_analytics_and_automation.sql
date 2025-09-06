-- 日次広告分析システムと自動化ジョブ設定
-- 作成日: 2025-09-06
-- 目的: 日次CTR監視、異常検知、自動レポーティング

begin;

-- 1. 日次集計ビュー
create or replace view public.vw_ad_stats_daily as
select 
    date_trunc('day', occurred_at)::date as event_date,
    simple_ad_id,
    placement_id,
    coalesce(flight_id, null) as flight_id, -- 開発環境のみ、本番環境では削除
    
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
    
    -- 時間帯分析
    count(*) filter (where type = 'impression' and extract(hour from occurred_at) between 9 and 17) as impressions_business_hours,
    count(*) filter (where type = 'click' and extract(hour from occurred_at) between 9 and 17) as clicks_business_hours,
    
    -- デバイス分析
    count(*) filter (where type = 'impression' and (client_meta->>'mobile')::boolean = true) as impressions_mobile,
    count(*) filter (where type = 'click' and (client_meta->>'mobile')::boolean = true) as clicks_mobile,
    
    -- 統計的信頼性評価
    case 
        when count(*) filter (where type = 'impression') >= 100 then 'high'
        when count(*) filter (where type = 'impression') >= 30 then 'medium'
        when count(*) filter (where type = 'impression') >= 10 then 'low'
        else 'insufficient'
    end as statistical_confidence,
    
    -- 最初と最後のイベント
    min(occurred_at) as first_event_at,
    max(occurred_at) as last_event_at
    
from public.ad_events 
where occurred_at >= current_date - interval '90 days'
group by 
    date_trunc('day', occurred_at),
    simple_ad_id,
    placement_id,
    flight_id; -- 本番環境では削除

-- 2. 日次異常検知関数
create or replace function public.detect_daily_ad_anomalies(
    target_date date default current_date,
    lookback_days integer default 7
)
returns table (
    alert_type text,
    simple_ad_id uuid,
    placement_id uuid,
    event_date date,
    metric_name text,
    current_value numeric,
    baseline_avg numeric,
    deviation_percentage numeric,
    severity text,
    recommendation text
)
language plpgsql
security definer
as $$
begin
    return query
    with baseline_stats as (
        select 
            simple_ad_id,
            placement_id,
            avg(impressions) as avg_impressions,
            avg(ctr_percentage) as avg_ctr,
            stddev(impressions) as stddev_impressions,
            stddev(ctr_percentage) as stddev_ctr,
            count(*) as data_points
        from public.vw_ad_stats_daily
        where event_date >= target_date - interval '1 day' * lookback_days
        and event_date < target_date
        and impressions >= 5 -- 最小データ量
        group by simple_ad_id, placement_id
        having count(*) >= 3 -- 最低3日分のデータ
    ),
    target_stats as (
        select 
            simple_ad_id,
            placement_id,
            event_date,
            impressions,
            ctr_percentage
        from public.vw_ad_stats_daily
        where event_date = target_date
        and impressions >= 5
    )
    -- インプレッション数異常検知
    select 
        'impression_drop'::text,
        t.simple_ad_id,
        t.placement_id,
        t.event_date,
        'impressions'::text,
        t.impressions::numeric,
        round(b.avg_impressions, 2),
        case when b.avg_impressions > 0 
             then round(((t.impressions - b.avg_impressions) / b.avg_impressions * 100), 2)
             else 0 end,
        case 
            when t.impressions < b.avg_impressions - 2 * coalesce(b.stddev_impressions, 0) then 'critical'
            when t.impressions < b.avg_impressions - 1.5 * coalesce(b.stddev_impressions, 0) then 'warning'
            else 'normal'
        end,
        case 
            when t.impressions < b.avg_impressions - 2 * coalesce(b.stddev_impressions, 0) then '配信設定とターゲティングを確認してください'
            when t.impressions < b.avg_impressions - 1.5 * coalesce(b.stddev_impressions, 0) then '予算や入札価格を見直してください'
            else ''
        end
    from target_stats t
    join baseline_stats b using (simple_ad_id, placement_id)
    where t.impressions < b.avg_impressions - 1.5 * coalesce(b.stddev_impressions, 0)
    
    union all
    
    -- CTR異常検知
    select 
        'ctr_anomaly'::text,
        t.simple_ad_id,
        t.placement_id,
        t.event_date,
        'ctr_percentage'::text,
        t.ctr_percentage,
        round(b.avg_ctr, 4),
        case when b.avg_ctr > 0 
             then round(((t.ctr_percentage - b.avg_ctr) / b.avg_ctr * 100), 2)
             else 0 end,
        case 
            when abs(t.ctr_percentage - b.avg_ctr) > 2 * coalesce(b.stddev_ctr, 0) then 'critical'
            when abs(t.ctr_percentage - b.avg_ctr) > 1.5 * coalesce(b.stddev_ctr, 0) then 'warning'
            else 'normal'
        end,
        case 
            when t.ctr_percentage > b.avg_ctr + 2 * coalesce(b.stddev_ctr, 0) then '高パフォーマンス広告です。予算増額を検討してください'
            when t.ctr_percentage < b.avg_ctr - 2 * coalesce(b.stddev_ctr, 0) then 'クリエイティブやターゲティングの見直しが必要です'
            else ''
        end
    from target_stats t
    join baseline_stats b using (simple_ad_id, placement_id)
    where abs(t.ctr_percentage - b.avg_ctr) > 1.5 * coalesce(b.stddev_ctr, 0)
    
    order by 
        case severity when 'critical' then 1 when 'warning' then 2 else 3 end,
        deviation_percentage desc;
end;
$$;

-- 3. 日次サマリーレポート関数
create or replace function public.generate_daily_ad_report(
    target_date date default current_date
)
returns table (
    section text,
    metric text,
    value text,
    comparison text,
    status text
)
language plpgsql
security definer
as $$
declare
    today_impressions bigint;
    today_clicks bigint;
    today_ctr numeric;
    yesterday_impressions bigint;
    yesterday_clicks bigint;
    yesterday_ctr numeric;
    unique_ads integer;
    active_placements integer;
begin
    -- 今日の指標
    select 
        coalesce(sum(impressions), 0),
        coalesce(sum(clicks), 0),
        case when sum(impressions) > 0 
             then round((sum(clicks)::numeric / sum(impressions)::numeric) * 100, 4) 
             else 0 end,
        count(distinct simple_ad_id),
        count(distinct placement_id)
    into today_impressions, today_clicks, today_ctr, unique_ads, active_placements
    from public.vw_ad_stats_daily 
    where event_date = target_date;
    
    -- 昨日の指標（比較用）
    select 
        coalesce(sum(impressions), 0),
        coalesce(sum(clicks), 0),
        case when sum(impressions) > 0 
             then round((sum(clicks)::numeric / sum(impressions)::numeric) * 100, 4) 
             else 0 end
    into yesterday_impressions, yesterday_clicks, yesterday_ctr
    from public.vw_ad_stats_daily 
    where event_date = target_date - 1;
    
    -- レポート出力
    return query
    select 'daily_summary'::text, 'total_impressions'::text, today_impressions::text, 
           case when yesterday_impressions > 0 
                then round(((today_impressions::numeric - yesterday_impressions) / yesterday_impressions * 100), 1)::text || '%'
                else 'N/A' end,
           case when today_impressions >= yesterday_impressions then 'positive' else 'negative' end
    union all
    select 'daily_summary'::text, 'total_clicks'::text, today_clicks::text,
           case when yesterday_clicks > 0 
                then round(((today_clicks::numeric - yesterday_clicks) / yesterday_clicks * 100), 1)::text || '%'
                else 'N/A' end,
           case when today_clicks >= yesterday_clicks then 'positive' else 'negative' end
    union all
    select 'daily_summary'::text, 'overall_ctr'::text, today_ctr::text || '%',
           case when yesterday_ctr > 0 
                then round((today_ctr - yesterday_ctr), 2)::text || 'pt'
                else 'N/A' end,
           case when today_ctr >= yesterday_ctr then 'positive' else 'negative' end
    union all
    select 'daily_summary'::text, 'active_ads'::text, unique_ads::text, 'N/A', 'neutral'
    union all
    select 'daily_summary'::text, 'active_placements'::text, active_placements::text, 'N/A', 'neutral';
end;
$$;

-- 4. システムログテーブル作成（存在しない場合）
create table if not exists public.system_logs (
    id bigserial primary key,
    log_level text not null,
    message text not null,
    context jsonb default '{}',
    created_at timestamptz default now()
);

-- インデックス作成
create index if not exists system_logs_created_at_idx on public.system_logs(created_at);
create index if not exists system_logs_log_level_idx on public.system_logs(log_level);

-- 5. ログ確認用ビュー
create or replace view public.vw_ad_analytics_logs as
select 
    id,
    log_level,
    message,
    context,
    created_at,
    -- ログの種類を分類
    case 
        when context->>'source' = 'automated_daily_check' then 'Daily Anomaly Check'
        when context->>'source' = 'automated_weekly_summary' then 'Weekly Summary'
        else 'Other'
    end as log_category
from public.system_logs
where message like '%ad%' or context->>'source' like '%ad%'
order by created_at desc;

-- 6. 自動化用関数
create or replace function public.run_daily_ad_anomaly_check()
returns text
language plpgsql
security definer
as $$
declare
    anomaly_count integer;
    alert_text text;
begin
    -- 昨日の異常数をカウント
    select count(*) into anomaly_count
    from public.detect_daily_ad_anomalies(current_date - 1);
    
    -- 異常が検出された場合のログ記録
    if anomaly_count > 0 then
        insert into public.system_logs (log_level, message, context, created_at)
        values (
            'WARNING',
            format('Daily ad anomalies detected: %s alerts', anomaly_count),
            jsonb_build_object(
                'date', current_date - 1,
                'anomaly_count', anomaly_count,
                'source', 'automated_daily_check'
            ),
            now()
        );
        return format('Anomaly check completed: %s alerts found', anomaly_count);
    else
        insert into public.system_logs (log_level, message, context, created_at)
        values (
            'INFO',
            'Daily ad anomaly check completed: No issues detected',
            jsonb_build_object(
                'date', current_date - 1,
                'anomaly_count', 0,
                'source', 'automated_daily_check'
            ),
            now()
        );
        return 'Anomaly check completed: No issues detected';
    end if;
end;
$$;

create or replace function public.run_weekly_ad_summary()
returns text
language plpgsql
security definer
as $$
declare
    summary_data jsonb;
    week_start date;
    week_end date;
    total_impressions bigint;
    total_clicks bigint;
    avg_ctr numeric;
begin
    week_start := date_trunc('week', current_date - 7);
    week_end := week_start + 6;
    
    -- 週次サマリーを生成
    select 
        coalesce(sum(impressions), 0),
        coalesce(sum(clicks), 0),
        case when sum(impressions) > 0 
             then round((sum(clicks)::numeric / sum(impressions)::numeric) * 100, 2)
             else 0 end
    into total_impressions, total_clicks, avg_ctr
    from public.vw_ad_stats_daily
    where event_date between week_start and week_end;
    
    -- 日別詳細も取得
    select jsonb_agg(
        jsonb_build_object(
            'date', event_date,
            'impressions', coalesce(sum(impressions), 0),
            'clicks', coalesce(sum(clicks), 0),
            'ctr', case when sum(impressions) > 0 
                        then round((sum(clicks)::numeric / sum(impressions)::numeric) * 100, 2)
                        else 0 end
        )
    ) into summary_data
    from public.vw_ad_stats_daily
    where event_date between week_start and week_end
    group by event_date
    order by event_date;
    
    -- ログに記録
    insert into public.system_logs (log_level, message, context, created_at)
    values (
        'INFO',
        format('Weekly ad performance summary for %s to %s: %s impressions, %s clicks, %s%% CTR', 
               week_start, week_end, total_impressions, total_clicks, avg_ctr),
        jsonb_build_object(
            'week_start', week_start,
            'week_end', week_end,
            'total_impressions', total_impressions,
            'total_clicks', total_clicks,
            'avg_ctr', avg_ctr,
            'daily_breakdown', summary_data,
            'source', 'automated_weekly_summary'
        ),
        now()
    );
    
    return format('Weekly summary completed: %s impressions, %s clicks, %s%% CTR', 
                  total_impressions, total_clicks, avg_ctr);
end;
$$;

-- 7. pg_cronジョブ設定
-- 注意: このセクションは手動実行が必要
-- 
-- 月次マテビューリフレッシュ（毎月1日 午前2時）
-- SELECT cron.schedule('monthly-ad-stats-refresh', '0 2 1 * *', 'SELECT public.refresh_mv_ad_stats_monthly();');
--
-- 日次異常検知レポート（毎日午前8時）  
-- SELECT cron.schedule('daily-ad-anomaly-check', '0 8 * * *', 'SELECT public.run_daily_ad_anomaly_check();');
--
-- 週次パフォーマンスサマリー（毎週月曜日 午前9時）
-- SELECT cron.schedule('weekly-ad-performance-summary', '0 9 * * 1', 'SELECT public.run_weekly_ad_summary();');

-- 権限設定
grant select on public.vw_ad_stats_daily to authenticated;
grant execute on function public.detect_daily_ad_anomalies(date, integer) to authenticated;
grant execute on function public.generate_daily_ad_report(date) to authenticated;
grant select on public.system_logs to authenticated;
grant select on public.vw_ad_analytics_logs to authenticated;
grant execute on function public.run_daily_ad_anomaly_check() to authenticated;
grant execute on function public.run_weekly_ad_summary() to authenticated;

commit;

-- 使用方法メモ:
-- 1. 日次データ確認: SELECT * FROM public.vw_ad_stats_daily WHERE event_date = current_date;
-- 2. 日次異常検知: SELECT * FROM public.detect_daily_ad_anomalies();
-- 3. 日次レポート: SELECT * FROM public.generate_daily_ad_report();
-- 4. システムログ確認: SELECT * FROM public.vw_ad_analytics_logs;
-- 5. 手動異常チェック実行: SELECT public.run_daily_ad_anomaly_check();
-- 6. 手動週次サマリー実行: SELECT public.run_weekly_ad_summary();
