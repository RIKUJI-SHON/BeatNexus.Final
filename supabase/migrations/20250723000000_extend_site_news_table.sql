-- 既存の site_news テーブルを拡張して記事管理機能を強化
-- 作成日: 2025年7月23日

-- 新しいカラムを追加
ALTER TABLE public.site_news 
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'link' CHECK (content_type IN ('link', 'article')),
ADD COLUMN IF NOT EXISTS article_content text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- 既存のカラムにコメントを追加
COMMENT ON COLUMN public.site_news.content_type IS 'コンテンツタイプ: link(外部リンク) または article(記事)';
COMMENT ON COLUMN public.site_news.article_content IS '記事本文（Markdown形式、content_type=articleの場合に使用）';
COMMENT ON COLUMN public.site_news.meta_description IS 'SEO用メタディスクリプション';
COMMENT ON COLUMN public.site_news.tags IS 'タグの配列';
COMMENT ON COLUMN public.site_news.is_featured IS '注目記事フラグ';
COMMENT ON COLUMN public.site_news.is_published IS '公開状態（false=下書き、true=公開）';
COMMENT ON COLUMN public.site_news.display_order IS '表示順序（数値が小さいほど優先表示、0が最優先）';

-- パフォーマンス向上のためのインデックスを作成
CREATE INDEX IF NOT EXISTS idx_site_news_display_order 
ON public.site_news(display_order, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_news_published 
ON public.site_news(is_published, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_news_content_type 
ON public.site_news(content_type, is_published, display_order);

-- タグ検索用のGINインデックス（将来的なタグ検索機能のため）
CREATE INDEX IF NOT EXISTS idx_site_news_tags 
ON public.site_news USING GIN (tags);

-- 既存のRLSポリシーは維持（変更なし）
-- 読み取りは誰でもOK、書き込みは認証ユーザーのみ

-- テスト用のサンプルデータを挿入（開発環境用）
-- 本番環境では手動で削除してください
INSERT INTO public.site_news (
  title, 
  body, 
  content_type, 
  article_content, 
  meta_description, 
  tags, 
  is_featured, 
  is_published, 
  display_order, 
  image_url
) VALUES 
-- リンク型のサンプル
(
  'BeatNexus 公式ブログ開設！',
  '最新情報やTips、コミュニティの話題をお届けします。',
  'link',
  NULL,
  'BeatNexus公式ブログで最新情報をチェック',
  ARRAY['お知らせ', 'ブログ'],
  true,
  true,
  1,
  NULL
),
-- 記事型のサンプル
(
  'はじめてのBeat作成ガイド',
  'Beat制作が初めての方向けの完全ガイドです。基本的な操作から応用テクニックまで詳しく解説します。',
  'article',
  '# はじめてのBeat作成ガイド

## 基本的な操作

BeatNexusでのBeat作成は直感的で簡単です。以下の手順で始めましょう：

1. **録音ボタンをタップ**
   - マイクアイコンをタップして録音を開始
   - 最大30秒まで録音可能

2. **エフェクトを追加**
   - リバーブ、ディストーション、フィルターなど多彩なエフェクト
   - リアルタイムでプレビュー可能

3. **投稿してバトル参加**
   - タイトルとタグを設定
   - コミュニティに投稿してフィードバックを得よう

## 応用テクニック

### レイヤリング
複数の音を重ねることで、より豊かなサウンドを作成できます。

### タイミング調整
正確なタイミングでビートを刻むことが重要です。

楽しいBeat作成ライフを始めましょう！',
  'BeatNexus初心者向けのBeat作成完全ガイド。基本操作から応用テクニックまで',
  ARRAY['ガイド', '初心者向け', 'Beat作成', 'チュートリアル'],
  false,
  true,
  2,
  NULL
) 
ON CONFLICT (id) DO NOTHING; -- 既存データがある場合は挿入しない
