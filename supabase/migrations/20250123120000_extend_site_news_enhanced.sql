-- テーブル拡張マイグレーション: site_newsテーブルに新しいカラムを追加
-- 作成日: 2025年1月23日

-- 新しいカラムを追加
ALTER TABLE public.site_news 
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'link' CHECK (content_type IN ('link', 'article')),
ADD COLUMN IF NOT EXISTS article_content text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- 既存のカラムのコメントを追加
COMMENT ON COLUMN public.site_news.title IS 'カルーセルに表示する見出し';
COMMENT ON COLUMN public.site_news.body IS 'お知らせの詳細内容（markdown可）';
COMMENT ON COLUMN public.site_news.image_url IS 'カルーセルの背景画像URL（任意）';
COMMENT ON COLUMN public.site_news.link_url IS 'クリック時に遷移させたい外部リンク（任意）';
COMMENT ON COLUMN public.site_news.content_type IS 'コンテンツタイプ（link: 外部リンク、article: 記事詳細）';
COMMENT ON COLUMN public.site_news.article_content IS '記事本文（content_type=''article''の場合）';
COMMENT ON COLUMN public.site_news.meta_description IS 'SEO用メタディスクリプション';
COMMENT ON COLUMN public.site_news.tags IS 'タグ配列';
COMMENT ON COLUMN public.site_news.is_featured IS '注目記事フラグ';
COMMENT ON COLUMN public.site_news.is_published IS '公開状態';
COMMENT ON COLUMN public.site_news.display_order IS '表示順序（数値が小さいほど優先）';

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_site_news_display_order ON public.site_news(display_order, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_news_published ON public.site_news(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_news_featured ON public.site_news(is_featured, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_news_content_type ON public.site_news(content_type, published_at DESC);

-- テーブルのコメントを更新
COMMENT ON TABLE public.site_news IS 'サイトニュース・お知らせ管理テーブル（カルーセル表示対応）';
