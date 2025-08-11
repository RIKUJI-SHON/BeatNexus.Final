-- BattlesPage ニュース/広告カルーセル 多言語対応: language カラム追加と複合インデックス
-- プロジェクト: BeatNexus
-- 先に開発環境 (wdttluticnlqzmqmfvgt) で適用・検証してから本番に適用すること。

-- 1) language カラム追加（デフォルト 'en'）
alter table public.site_news
  add column if not exists language varchar not null default 'en'
  check (language in ('en','ja','ko','zh-CN','es','pt-BR','fr','de'));

-- 2) 複合インデックス（言語 + 公開 + 表示順 + 公開日）
create index if not exists idx_site_news_lang_published_order
  on public.site_news(language, is_published, display_order, published_at desc);

-- 3) 備考: 既存行は default により 'en' がセットされる。必要に応じ運用で更新。
-- 例: 全記事を日本語とするケース
-- update public.site_news set language = 'ja' where language = 'en';
