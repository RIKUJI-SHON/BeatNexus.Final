-- 3件ごとの広告配置への広告割り当て
-- 既存の広告を新しい配置場所にローテーションで割り当て
-- 本番環境用マイグレーション

begin;

-- 既存の広告をローテーションで各配置に割り当て
-- 広告が存在する場合のみ実行（本番環境では広告データが存在する場合）
do $$
declare
  ad_ids uuid[];
  placement_ids uuid[];
  i integer;
  ad_index integer;
begin
  -- アクティブな広告IDを取得
  select array_agg(id) into ad_ids 
  from simple_ads 
  where is_active = true 
    and contract_start_date <= current_date 
    and contract_end_date >= current_date
  limit 10; -- 最大10個まで

  -- battles.list.after-* の配置IDを取得（3,6,9...30）
  select array_agg(id order by key) into placement_ids
  from ad_placements 
  where key ~ '^battles\.list\.after-[0-9]+\.infeed$'
    and key != 'battles.list.after-10.infeed'; -- 既存の10は除外

  -- 広告と配置が存在する場合のみ割り当て実行
  if array_length(ad_ids, 1) > 0 and array_length(placement_ids, 1) > 0 then
    -- 各配置に広告をローテーションで割り当て
    for i in 1..array_length(placement_ids, 1) loop
      ad_index := ((i - 1) % array_length(ad_ids, 1)) + 1;
      
      insert into ad_placement_assignments (placement_id, simple_ad_id, priority, is_pinned)
      values (placement_ids[i], ad_ids[ad_index], 100, false)
      on conflict (placement_id, simple_ad_id) do nothing;
    end loop;
    
    raise notice '広告割り当て完了: % 個の配置に % 個の広告をローテーション割り当て', 
                 array_length(placement_ids, 1), array_length(ad_ids, 1);
  else
    raise notice '広告または配置が見つかりません。広告数: %, 配置数: %', 
                 coalesce(array_length(ad_ids, 1), 0), coalesce(array_length(placement_ids, 1), 0);
  end if;
end $$;

commit;
