-- Create site_news table for news carousel
create table public.site_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,           -- カルーセルに表示する見出し
  body text not null,            -- お知らせの詳細内容（markdown可）
  image_url text,                -- カルーセルの背景画像URL（任意）
  link_url text,                 -- クリック時に遷移させたい外部リンク（任意）
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.site_news enable row level security;

-- RLS Policies
-- ① 読み取りは誰でもOK
create policy "Public read access" on public.site_news
for select
using (true);

-- ② 書き込みは認証ユーザーのみ（将来的に管理者権限に限定予定）
create policy "Authenticated users can insert" on public.site_news
for insert
with check (auth.role() = 'authenticated');

create policy "Authenticated users can update" on public.site_news
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete" on public.site_news
for delete
using (auth.role() = 'authenticated');
