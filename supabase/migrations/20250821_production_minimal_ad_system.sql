-- シンプル広告システム本番環境用最小構成マイグレーション
-- 目的: 必要最小限のテーブルのみを本番環境に展開

-- 依存順序: advertisers → ad_placements → simple_ads → ad_placement_assignments

-- 1. 広告主テーブル（既存を活用）
create table if not exists advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_info jsonb,
  billing_info jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. 広告配置場所テーブル（既存を活用）
create table if not exists ad_placements (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  description text,
  size text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. シンプル広告コンテンツテーブル（新システムのコア）
create table if not exists simple_ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references advertisers(id) on delete cascade,
  
  -- 広告コンテンツ
  title text not null,
  description text,
  image_url text,
  click_url text not null,
  
  -- 契約・期間情報
  contract_start_date date not null,
  contract_end_date date not null,
  is_active boolean default true,
  
  -- メタデータ
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. 広告配置割り当てテーブル（配置ロジック）
create table if not exists ad_placement_assignments (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid references ad_placements(id) on delete cascade,
  simple_ad_id uuid references simple_ads(id) on delete cascade,
  
  -- 表示設定
  priority integer default 100,
  is_pinned boolean default false,
  
  -- タイムスタンプ
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(placement_id, simple_ad_id)
);

-- インデックス作成（パフォーマンス最適化）
create index if not exists advertisers_name_idx on advertisers(name);
create index if not exists ad_placements_key_active_idx on ad_placements(key, is_active);
create index if not exists simple_ads_advertiser_id_idx on simple_ads(advertiser_id);
create index if not exists simple_ads_active_contract_idx on simple_ads(is_active, contract_start_date, contract_end_date);
create index if not exists ad_placement_assignments_placement_idx on ad_placement_assignments(placement_id, is_pinned, priority);

-- RLS（行レベルセキュリティ）有効化
alter table advertisers enable row level security;
alter table ad_placements enable row level security;
alter table simple_ads enable row level security;
alter table ad_placement_assignments enable row level security;

-- app_role()関数（既存の場合はスキップ）
create or replace function app_role()
returns text
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::json->>'app_role',
    'end_user'
  );
$$;

-- RLSポリシー定義
-- advertisers
create policy advertisers_select on advertisers for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy advertisers_modify on advertisers for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));

-- ad_placements  
create policy ad_placements_select on ad_placements for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy ad_placements_modify on ad_placements for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));

-- simple_ads
create policy simple_ads_select on simple_ads for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy simple_ads_modify on simple_ads for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));

-- ad_placement_assignments
create policy ad_placement_assignments_select on ad_placement_assignments for select using (app_role() in ('internal_admin','ad_ops','viewer'));
create policy ad_placement_assignments_modify on ad_placement_assignments for all using (app_role() in ('internal_admin','ad_ops')) with check (app_role() in ('internal_admin','ad_ops'));

-- 更新日時の自動更新トリガー関数
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- トリガー設定
create trigger update_advertisers_updated_at before update on advertisers for each row execute procedure update_updated_at_column();
create trigger update_simple_ads_updated_at before update on simple_ads for each row execute procedure update_updated_at_column();
create trigger update_ad_placement_assignments_updated_at before update on ad_placement_assignments for each row execute procedure update_updated_at_column();

-- 基本配置場所のシードデータ（本番環境用）
insert into ad_placements (key, description, size) values 
('home.features.mid.inline', 'Home HowItWorks→Features 間 Inline', '728x90'),
('home.latest.before-list.infeed', 'Home LatestBattles 手前 InFeed', '300x250'),
('battles.list.after-3.infeed', 'Battles 3件後 InFeed', '300x250'),
('battles.list.after-10.infeed', 'Battles 10件後 InFeed 深部', '300x250'),
('ranking.top.banner', 'Ranking トップポディウム直下 Banner', '728x90'),
('ranking.list.after-5.infeed', 'Ranking 5位後 InFeed', '300x250')
on conflict (key) do nothing;

-- 本番環境確認用コメント
-- 最終的に必要なテーブル:
-- ✅ advertisers (1 table)
-- ✅ ad_placements (1 table)  
-- ✅ simple_ads (1 table)
-- ✅ ad_placement_assignments (1 table)
-- 合計: 4テーブル（従来の6テーブルから2テーブル削減）
