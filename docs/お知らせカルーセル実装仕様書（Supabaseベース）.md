---
description: "BattlesPageに表示するお知らせカルーセルの実装仕様（Supabaseベース）"
globs: ["src/pages/Battle/BattlesPage.tsx"]
alwaysApply: false
---

# お知らせカルーセル実装仕様書（Supabaseベース）

## 1️⃣ 概要
`BattlesPage` の上部に、お知らせやガイドを表示するためのカルーセルを実装する。データソースとしてSupabaseデータベースの `site_news` テーブルを利用し、管理者がSupabaseダッシュボードから直接投稿・管理できる仕組みとする。

### 1.1 背景
より柔軟なコンテンツ管理と視覚的に魅力的なUIを提供するため、`BattlesPage` にカルーセルを導入する。外部サービスに依存せず、既存のSupabaseインフラ内でコンテンツ管理を完結させる方針とする。

### 1.2 主な仕様
- **表示場所**: `BattlesPage` の上部。既存の背景画像と「How-to Guide」コンポーネントのエリアを置き換える。
- **カルーセル構成**:
    1.  **固定パネル**: 最初のスライドは「How-to Guide」への導線として固定表示する。クリックするとガイドモーダルが開く。
    2.  **動的パネル**: 2枚目以降は、Supabaseの `site_news` テーブルから取得したお知らせ記事を表示順序と公開日時順に表示する。
- **動作**:
    - 自動でスライドする（8秒間隔、ゆっくりとした切り替え）
    - マウスホバー時や手動操作時は自動スライドを一時停止
    - ユーザーが手動でスライド操作する（左右矢印、スワイプ対応）
    - 一度に表示するパネルは1つ
- **コンテンツタイプ**:
    - **article**: アプリ内で記事詳細を表示する記事（全てのニュースは記事モーダルで表示）

### 1.3 レスポンシブ設計
- **デスクトップ**: 高さ 384px（h-96）、フル幅表示
- **タブレット**: 高さ 320px（h-80）
- **モバイル**: 高さ 256px（h-64）、スワイプ操作対応

---

## 2️⃣ データベース設計（Supabase）

### 2.1 テーブル設計
```sql
create table public.site_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,           -- カルーセルに表示する見出し
  body text not null,            -- お知らせの詳細内容（markdown可）
  image_url text,                -- カルーセルの背景画像URL（任意）
  link_url text,                 -- 外部リンク（廃止予定）
  content_type text default 'article' check (content_type = 'article'), -- コンテンツタイプ（記事のみ）
  article_content text not null, -- 記事本文（必須）
  meta_description text,         -- SEO用メタディスクリプション
  tags text[],                   -- タグ配列
  is_featured boolean default false, -- 注目記事フラグ
  is_published boolean default true, -- 公開状態
  display_order integer default 0,   -- 表示順序（数値が小さいほど優先）
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 表示順序用のインデックス
create index idx_site_news_display_order on public.site_news(display_order, published_at desc);
-- 公開記事用のインデックス
create index idx_site_news_published on public.site_news(is_published, published_at desc);
```

### 2.2 RLS（Row Level Security）ポリシー
```sql
alter table public.site_news enable row level security;

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
```

### 2.3 マイグレーションファイル
`supabase/migrations/20250722120000_create_site_news_table.sql` を作成し、上記SQLを保存する。

---

## 3️⃣ フロントエンド実装

### 3.1 使用ライブラリ
- **UIコンポーネント**: `shadcn/ui` の `Carousel` を使用
- **データ取得**: 既存の Supabase クライアント

### 3.2 実装タスク
1.  **テーブル拡張マイグレーション**:
    - 既存の `site_news` テーブルに新しいカラムを追加するマイグレーションを作成
    - `supabase/migrations/20250723000000_extend_site_news_table.sql`

2.  **型定義の拡張**:
    - `src/types/news.ts` を更新し、新しいカラムに対応した型を定義

3.  **データ取得フックの改良**:
    - `src/hooks/useNews.ts` を更新し、公開状態と表示順序を考慮したクエリに変更
    - キャッシュ機能とリフェッチ機能を追加

4.  **カルーセルコンポーネントの改良**:
    - `src/components/battle/NewsCarousel.tsx` を更新
    - コンテンツタイプ別の表示処理を実装
    - 記事詳細モーダルの実装

5.  **記事詳細モーダルの作成**:
    - `src/components/ui/ArticleModal.tsx` を新規作成
    - Markdownレンダリング機能を実装

6.  **管理画面の基盤準備**（オプション）:
    - `src/pages/admin/NewsManagement.tsx` の基本構造を作成

### 3.3 コンポーネント構成
```
NewsCarousel.tsx
├── HowToGuidePanel（固定パネル）
│   ├── 背景画像: hero-background.png
│   ├── ロゴ表示: BEATNEXUS-WORDMARK.png
│   ├── 説明テキスト: "New here? Check out our How-to Guide"
│   └── クリック → オンボーディングモーダル開く
└── NewsPanel（動的パネル）
    └── ArticleTypePanel（記事詳細モーダル表示）
        ├── タイトル表示
        ├── 背景画像表示（image_url）
        ├── 記事概要（meta_description）
        └── クリック → 記事詳細モーダル開く

ArticleModal.tsx（新規作成）
├── モーダルヘッダー
│   ├── 記事タイトル
│   ├── 公開日時
│   └── 閉じるボタン
├── モーダルボディ
│   ├── メイン画像（image_url）
│   ├── 記事本文（article_content - Markdown）
│   └── タグ表示
└── モーダルフッター
    ├── SNSシェアボタン（オプション）
    └── 閉じるボタン
```

### 3.4 データフロー
```
1. useNews() → Supabase Query
   ↓
2. 公開済み記事を display_order, published_at 順で取得
   ↓
3. NewsCarousel で表示
   ├── 固定パネル（How-to Guide）
   └── 動的パネル（取得した記事）
       └── article → ArticleModal 表示
```

---

## 4️⃣ 運用フロー

### 4.1 基本的な投稿手順
1.  Supabase ダッシュボードにログインする
2.  Table Editor → `site_news` テーブルを開く
3.  「Insert Row」で新しいお知らせを追加

### 4.2 記事投稿の設定

#### 📄 記事型（content_type='article'）
```
title: "BeatNexusの使い方完全ガイド"
body: "初心者向けの詳細ガイドを公開しました"
content_type: "article"
article_content: "# BeatNexusへようこそ\n\n## 基本的な使い方\n..."
meta_description: "BeatNexusの基本的な使い方から応用まで詳しく解説"
tags: ["ガイド", "初心者向け", "使い方"]
image_url: "https://images.beatnexus.com/guides/complete-guide.jpg"
is_published: true
display_order: 10
```

### 4.3 表示制御
- **display_order**: 小さい数値ほど優先表示（0が最優先）
- **is_published**: false の場合は非表示
- **is_featured**: 将来的な注目記事マーク用

---

## 5️⃣ 技術的詳細仕様

### 5.1 データ取得仕様
```typescript
// useNews.ts の実装仕様
interface NewsQuery {
  limit?: number;        // 取得件数（デフォルト: 10）
  includeUnpublished?: boolean; // 非公開記事も含めるか（管理者用）
}

// クエリ順序: display_order ASC, published_at DESC
// キャッシュ: React Query使用、5分間キャッシュ
```

### 5.2 カルーセル表示仕様
```typescript
// 表示順序
1. How-to Guide（固定）
2. display_order の小さい順
3. 同じ display_order の場合は published_at の新しい順

// レスポンシブ高さ
- lg以上: h-96 (384px)
- md-lg: h-80 (320px)  
- sm-md: h-72 (288px)
- sm未満: h-64 (256px)
```

### 5.3 記事詳細モーダル仕様
```typescript
// Markdownサポート
- 見出し（h1-h6）
- リスト（ul, ol）
- リンク
- 画像埋め込み
- コードブロック
- 太字、斜体

// モーダルサイズ
- 最大幅: 800px
- 最大高さ: 80vh
- スクロール対応
```

---

## 6️⃣ 今後の拡張予定
- **管理画面**: 認証済み管理者専用の投稿・編集UI実装
- **ドラフト機能**: `is_published` フラグ追加でステージング運用 ✅（実装済み）
- **多言語対応**: `language` カラム追加、ユーザーの言語設定でフィルタリング
- **ピン留め機能**: `is_pinned` + `pinned_order` でお知らせの固定表示
- **Realtime更新**: Supabase Realtime機能でリアルタイム反映
- **Analytics**: 記事閲覧数・クリック数の追跡
- **SEO強化**: 記事型コンテンツの個別URLとメタタグ対応

---

## 7️⃣ 実装優先度

### Phase 1: 基本実装（必須）
- [ ] テーブル拡張マイグレーション
- [ ] 型定義更新
- [ ] useNews フック改良
- [ ] NewsCarousel コンポーネント更新
- [ ] ArticleModal 作成

### Phase 2: 運用改善（推奨）
- [ ] エラーハンドリング強化
- [ ] ローディング状態改善
- [ ] キャッシュ最適化
- [ ] レスポンシブ調整

### Phase 3: 追加機能（オプション）
- [ ] 管理画面UI
- [ ] Analytics実装
- [ ] 多言語対応
- [ ] SEO機能

---

## ✅ 検証項目
## ✅ 検証項目

### Phase 1 検証項目
- [ ] 拡張マイグレーションが正常に実行され、新しいカラムが追加されるか
- [ ] `BattlesPage` にカルーセルが表示されるか
- [ ] 最初のパネルが「How-to Guide」で、クリックするとモーダルが開くか
- [ ] 2枚目以降にSupabaseのお知らせが display_order, published_at 順に表示されるか
- [ ] link型記事をクリックすると外部リンクに遷移するか（廃止）
- [ ] article型記事をクリックすると記事詳細モーダルが開くか
- [ ] 記事詳細モーダルでMarkdownが正しくレンダリングされるか
- [ ] 左右の矢印ボタンで手動スライドができるか
- [ ] スマートフォンでスワイプ操作ができるか
- [ ] is_published=false の記事が表示されないか
- [ ] お知らせが0件の場合でもレイアウトが崩れないか（How-to Guideのみ表示）

### Phase 2 検証項目
- [ ] 画像URLが設定されたお知らせで背景画像が正しく表示されるか
- [ ] 画像URLが未設定のお知らせでもレイアウトが崩れないか
- [ ] ローディング中にスケルトンUIまたはローディング表示がされるか
- [ ] エラー発生時に適切なエラー表示がされるか
- [ ] レスポンシブデザインが各デバイスで適切に動作するか
- [ ] display_order による表示順序制御が正しく動作するか

---

**更新日**: 2025年7月23日  
**作成者**: AI Assistant  
**バージョン**: 2.0（拡張仕様対応）
