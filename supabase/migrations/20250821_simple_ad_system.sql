-- シンプルな広告システム: 複雑なキャンペーン・フライト構造を排除
-- ユーザー要望: 企業データ + 広告素材 + 配置設定のみ

-- 既存のadvertisersテーブルを活用（企業データ）
-- ↓ 新しいシンプルな広告コンテンツテーブル
create table if not exists simple_ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references advertisers(id) on delete cascade,
  
  -- 広告コンテンツ
  title text not null,                    -- 広告タイトル
  description text,                       -- 広告説明文
  image_url text,                         -- 画像URL
  click_url text not null,                -- クリック先URL
  
  -- 契約・期間情報
  contract_start_date date not null,      -- 契約開始日
  contract_end_date date not null,        -- 契約終了日
  is_active boolean default true,         -- アクティブ状態
  
  -- メタデータ
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 広告配置割り当てテーブル（どこに何を配置するか）
create table if not exists ad_placement_assignments (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid references ad_placements(id) on delete cascade,
  simple_ad_id uuid references simple_ads(id) on delete cascade,
  
  -- 表示設定
  priority integer default 100,           -- 優先度（数値が小さいほど優先）
  is_pinned boolean default false,        -- 固定表示フラグ
  
  -- タイムスタンプ
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(placement_id, simple_ad_id)
);

-- インデックス作成
create index if not exists simple_ads_advertiser_id_idx on simple_ads(advertiser_id);
create index if not exists simple_ads_active_contract_idx on simple_ads(is_active, contract_start_date, contract_end_date);
create index if not exists ad_placement_assignments_placement_idx on ad_placement_assignments(placement_id, is_pinned, priority);

-- RLS ポリシー追加
alter table simple_ads enable row level security;
alter table ad_placement_assignments enable row level security;

-- simple_ads のポリシー
create policy simple_ads_select on simple_ads for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy simple_ads_modify on simple_ads for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));

-- ad_placement_assignments のポリシー
create policy ad_placement_assignments_select on ad_placement_assignments for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy ad_placement_assignments_modify on ad_placement_assignments for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));

-- 更新日時の自動更新トリガー
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_simple_ads_updated_at before update on simple_ads for each row execute procedure update_updated_at_column();
create trigger update_ad_placement_assignments_updated_at before update on ad_placement_assignments for each row execute procedure update_updated_at_column();
