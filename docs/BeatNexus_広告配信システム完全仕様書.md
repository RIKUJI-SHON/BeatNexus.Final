# BeatNexus シンプル広告配信システム 完全仕様書

**作成日**: 2025年8月21日  
**バージョン**: 1.0  
**対象**: 運営チーム・開発チーム・広告運用担当者  
**システム名**: BeatNexus Simple Ad Delivery System

---

## 📋 目次

1. [システム概要](#1-システム概要)
2. [アーキテクチャ](#2-アーキテクチャ)
3. [データベース設計](#3-データベース設計)
4. [API仕様](#4-api仕様)
5. [フロントエンド実装](#5-フロントエンド実装)
6. [配置場所仕様](#6-配置場所仕様)
7. [運用ガイドライン](#7-運用ガイドライン)
8. [セキュリティ](#8-セキュリティ)
9. [トラブルシューティング](#9-トラブルシューティング)
10. [今後の拡張計画](#10-今後の拡張計画)

---

## 1. システム概要

### 1.1 目的
BeatNexusプラットフォーム上で効率的かつシンプルな広告配信を実現するシステム。「企業データ + 広告素材 + 配置設定」の3要素に絞り込み、運営者が直感的に管理できる設計。

### 1.2 主要機能
- **広告主管理**: 企業情報の登録・管理（重み付き配信制御含む）
- **広告素材管理**: タイトル、説明文、画像、リンクの一元管理
- **重み付き配信制御**: 広告主単位での配信比率制御（weightカラム）
- **契約期間管理**: 開始日・終了日による自動配信制御
- **直接選択配信**: placement assignmentを廃止した簡素化システム
- **NoFill対応**: 配信対象がない場合の適切な処理

### 1.3 設計原則
- **シンプル性**: 複雑なplacement assignmentを排除し、直接重み付き選択を採用
- **運用効率**: 重み付けによる直感的な配信比率制御
- **拡張性**: 将来的な機能追加に対応可能な設計
- **パフォーマンス**: 高速な広告配信とレスポンシブな表示
- **確実性**: 重み=0の広告主は絶対に配信されない保証

---

## 2. アーキテクチャ

### 2.1 システム構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Frontend      │    │   Supabase     │    │   Edge Function │
│   (React/TS)    │◄──►│   Database     │◄──►│   ad-serve      │
│                 │    │   (PostgreSQL)  │    │   (Deno/TS)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AdSlot        │    │   RLS Policies  │    │   Creative      │
│   Component     │    │   & Security    │    │   Response      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 データフロー

1. **フロントエンド** → AdSlotコンポーネントが配置場所キーを指定
2. **Edge Function** → 全ての有効な広告から重み付き直接選択
3. **データベース** → `weighted_random_ad()`関数で契約期間・重み・有効性を考慮
4. **レスポンス** → 広告クリエイティブまたはNoFillを返却
5. **表示** → AdSlotが適切な形式で広告を描画

### 2.2.1 簡素化されたアーキテクチャ

**旧システム（複雑）**:
placement → placement_assignment → advertiser selection → ad selection

**新システム（簡素化）**:
placement → `weighted_random_ad()` → direct ad selection

### 2.3 技術スタック

| 層 | 技術 | 用途 |
|---|------|------|
| フロントエンド | React 18 + TypeScript | UI・UX、AdSlotコンポーネント |
| バックエンド | Supabase Edge Functions (Deno) | 広告配信API |
| データベース | PostgreSQL (Supabase) | 広告データ・設定管理 |
| 認証・権限 | Supabase Auth + RLS | セキュリティ・権限制御 |
| デプロイ | Supabase Platform | インフラ・スケーリング |

---

## 3. データベース設計

### 3.1 テーブル構成

#### 3.1.1 advertisers（広告主）
```sql
CREATE TABLE advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,           -- 企業名
  website_url text,                    -- 公式サイトURL
  contact_email text,                  -- 連絡先メールアドレス
  weight integer DEFAULT 0,            -- 配信重み（0=配信停止、1-100=配信比率）
  is_active boolean DEFAULT true,      -- アクティブフラグ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 3.1.2 simple_ads（広告素材）
```sql
CREATE TABLE simple_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES advertisers(id) ON DELETE CASCADE,
  title text NOT NULL,                 -- 広告タイトル
  description text,                    -- 広告説明文
  image_url text,                      -- 画像URL
  click_url text NOT NULL,             -- クリック先URL
  contract_start_date date NOT NULL,   -- 契約開始日
  contract_end_date date NOT NULL,     -- 契約終了日
  is_active boolean DEFAULT true,      -- アクティブフラグ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 3.1.3 ad_placements（配置場所）
```sql
CREATE TABLE ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,            -- 配置場所キー
  description text NOT NULL,           -- 説明
  is_active boolean DEFAULT true,      -- アクティブフラグ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 3.1.4 ad_placement_assignments（配置割り当て）
```sql
-- 注意: このテーブルは後方互換性のために残されていますが、
-- 新しいシステムでは使用されません。
-- 配信は weighted_random_ad() 関数による直接選択で行われます。

CREATE TABLE ad_placement_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid REFERENCES ad_placements(id) ON DELETE CASCADE,
  simple_ad_id uuid REFERENCES simple_ads(id) ON DELETE CASCADE,
  priority integer DEFAULT 100,        -- 【非推奨】優先度（使用されません）
  is_pinned boolean DEFAULT false,     -- 【非推奨】固定表示フラグ（使用されません）
  created_at timestamptz DEFAULT now(),
  
  -- 同一配置場所・広告の重複防止
  UNIQUE(placement_id, simple_ad_id)
);
```

### 3.2 重み付き広告選択関数

```sql
-- 全ての有効な広告から直接重み付きで選択する関数
CREATE OR REPLACE FUNCTION weighted_random_ad()
RETURNS TABLE (
  ad_id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  click_url TEXT,
  advertiser_id UUID,
  advertiser_name TEXT,
  advertiser_weight INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH weighted_ads AS (
    SELECT 
      sa.id,
      sa.title,
      sa.description,
      sa.image_url,
      sa.click_url,
      a.id as advertiser_id,
      a.name as advertiser_name,
      a.weight as advertiser_weight,
      -- 重みを使って重複行を生成し、その中からランダムに1つ選ぶ
      generate_series(1, a.weight) as weight_multiplier
    FROM simple_ads sa
    JOIN advertisers a ON sa.advertiser_id = a.id
    WHERE sa.is_active = true 
      AND a.is_active = true 
      AND a.weight > 0  -- 重みが0の広告主は除外
      AND sa.contract_start_date <= CURRENT_DATE
      AND sa.contract_end_date >= CURRENT_DATE
  )
  SELECT 
    wa.id,
    wa.title,
    wa.description,
    wa.image_url,
    wa.click_url,
    wa.advertiser_id,
    wa.advertiser_name,
    wa.advertiser_weight
  FROM weighted_ads wa
  ORDER BY random()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 インデックス設計

```sql
-- 配信性能向上のためのインデックス
CREATE INDEX idx_ad_placements_key ON ad_placements(key) WHERE is_active = true;
CREATE INDEX idx_simple_ads_contract_dates ON simple_ads(contract_start_date, contract_end_date) WHERE is_active = true;
CREATE INDEX idx_advertisers_weight ON advertisers(weight) WHERE is_active = true AND weight > 0;
-- 【非推奨】placement assignment関連（使用されません）
CREATE INDEX idx_placement_assignments_priority ON ad_placement_assignments(placement_id, is_pinned DESC, priority ASC);
```

### 3.4 Row Level Security (RLS)

```sql
-- 広告データのセキュリティポリシー
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE simple_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_placement_assignments ENABLE ROW LEVEL SECURITY;

-- 権限ベースのアクセス制御
CREATE POLICY "ad_ops_full_access" ON advertisers FOR ALL TO authenticated 
  USING (auth.jwt() ->> 'app_role' IN ('internal_admin', 'ad_ops'));

CREATE POLICY "viewer_read_access" ON simple_ads FOR SELECT TO authenticated 
  USING (auth.jwt() ->> 'app_role' IN ('internal_admin', 'ad_ops', 'viewer'));
```

---

## 4. API仕様

### 4.1 広告配信API

#### エンドポイント
```
POST https://{project-id}.supabase.co/functions/v1/ad-serve
```

#### リクエスト
```json
{
  "placement": "home.wordmark.section.after.banner"
}
```

#### レスポンス（成功時）
```json
{
  "ok": true,
  "data": {
    "creative": {
      "headline": "AI作業効率化ツール「WorkFlow Pro」",
      "body": "月間1000時間の作業時間削減実績。直感的UIで誰でも簡単操作",
      "file_url": "https://example.com/image.jpg",
      "target_url": "https://workflow-pro.com",
      "cta_text": "詳しく見る"
    },
    "token": null
  }
}
```

#### レスポンス（NoFill時）
```json
{
  "ok": true,
  "noFill": true,
  "data": null
}
```

### 4.2 配信ロジック

1. **配置場所検証**: 指定されたplacementキーの存在確認（参考情報として受け取り）
2. **重み付き広告選択**: `weighted_random_ad()`関数による以下の処理
   - 有効な広告の抽出（`is_active = true`）
   - 契約期間内フィルタ（`contract_start_date <= 現在日 <= contract_end_date`）
   - 重みゼロ除外（`advertiser.weight > 0`）
   - 重み比例による確率的選択
3. **結果生成**: 条件に合致する広告またはNoFillを返却

#### 4.2.1 重み付けアルゴリズム

```
例：3つの広告主の場合
- 広告主A: weight=30 → 30回の選択機会
- 広告主B: weight=20 → 20回の選択機会  
- 広告主C: weight=5  → 5回の選択機会
- 広告主D: weight=0  → 選択されない（除外）

総選択機会: 55回
実際の配信比率:
- 広告主A: 30/55 = 54.5%
- 広告主B: 20/55 = 36.4%
- 広告主C: 5/55 = 9.1%
```

---

## 5. フロントエンド実装

### 5.1 AdSlotコンポーネント

#### 基本使用法
```tsx
import { AdSlot } from '@/components/ads/AdSlot';

// 基本的な使用例
<AdSlot
  placementKey="home.wordmark.section.after.banner"
  variant="banner"
  className="w-full max-w-4xl"
/>
```

#### Props仕様
```typescript
interface AdSlotProps {
  placementKey: string;                    // 配置場所キー（必須）
  variant?: 'infeed' | 'banner' | 'inline' | 'carousel'; // 表示バリアント
  userId?: string;                         // ユーザーID（将来の拡張用）
  className?: string;                      // CSSクラス
  render?: (props: RenderProps) => React.ReactNode; // カスタムレンダー
  preloadMargin?: string;                  // 先読みマージン
}
```

### 5.2 広告表示バリアント

#### Banner型
```tsx
<AdSlot
  placementKey="ranking.top.banner"
  variant="banner"
  className="w-full h-24"
/>
```
- **用途**: ページ上部・セクション間の横長バナー
- **特徴**: 固定高さ、全幅レイアウト
- **推奨サイズ**: 728x90px または 970x250px

#### Carousel型
```tsx
<AdSlot
  placementKey="home.hero.section.after.carousel"
  variant="carousel"
  className="w-full max-w-6xl"
/>
```
- **用途**: メインコンテンツ後のスライド表示
- **特徴**: レスポンシブ対応の画像のみ表示、クリック機能付き
- **PC版仕様**:
  - 画像のみ表示（タイトル・説明文なし）
  - `object-cover`で画像を全面表示
  - コンテナの高さ（h-64〜lg:h-96）に合わせてフィット
  - ホバー時にスケールエフェクト付きクリック指示表示
- **モバイル版仕様**:
  - 画像のみ表示（PC版同様）
  - カルーセル全体の高さ（h-full）を活用
  - 内側に`aspect-square`コンテナで正方形画像完全対応
  - `object-contain`で画像全体を完全表示
  - パディング（p-4）で適切な余白確保
  - 背景色（bg-gray-900）でコンテナを適切に埋める
- **推奨画像サイズ**: 
  - PC版: 1200x400px（横長推奨）
  - モバイル版: 正方形〜4:3比率（400x400px〜800x600px）
- **技術実装**: レスポンシブブレークポイント768px（md）で表示切り替え

#### InFeed型
```tsx
<AdSlot
  placementKey="battles.list.after-3.infeed"
  variant="infeed"
  className="w-full max-w-md"
/>
```
- **用途**: リストやフィード内への挿入
- **特徴**: 周辺コンテンツと一体化したデザイン
- **推奨サイズ**: 400x300px

#### Inline型
```tsx
<AdSlot
  placementKey="home.features.section.after.inline"
  variant="inline"
  className="w-full max-w-2xl"
/>
```
- **用途**: セクション間の区切り
- **特徴**: テキスト主体、画像はオプション
- **推奨サイズ**: 300x200px

### 5.3 レスポンシブ実装詳細

#### Carousel型のレスポンシブ設計
```typescript
// PC版実装（768px以上）
<div className="hidden md:block h-full w-full">
  <img
    src={creative.file_url}
    alt={creative.headline || 'Ad'}
    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
  />
</div>

// モバイル版実装（768px未満）
<div className="md:hidden w-full h-full flex items-center justify-center bg-gray-900 p-4">
  <div className="max-w-full max-h-full aspect-square flex items-center justify-center">
    <img
      src={creative.file_url}
      alt={creative.headline || 'Ad'}
      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
    />
  </div>
</div>
```

#### ブレークポイント仕様
- **境界値**: 768px（Tailwind CSSの`md`ブレークポイント）
- **PC版**: `md:block` / `hidden md:flex`
- **モバイル版**: `md:hidden`
- **切り替え**: CSSメディアクエリによる自動切り替え

#### 画像表示方式の違い
| デバイス | 表示方式 | 特徴 | 適用CSS |
|----------|----------|------|---------|
| PC版 | 全面表示 | コンテナ高さに合わせて画像をフィット | `object-cover` |
| モバイル版 | 完全表示 | 正方形コンテナ内で画像全体を完全表示 | `aspect-square` + `object-contain` |

### 5.4 NoFill処理

```typescript
// AdSlotコンポーネント内のNoFill処理
if (serve.noFill || !serve.creative) {
  return null; // 何も表示しない
}

// 代替コンテンツの表示（オプション）
if (serve.noFill && fallback) {
  return <>{fallback}</>;
}
```

---

## 6. 配置場所仕様

### 6.1 ホームページ（HomepageTestPage）

| キー | 説明 | 位置 | バリアント |
|------|------|------|------------|
| `home.wordmark.section.after.banner` | ワードマークセクション後（ヒーローセクション前） | 最上部 | banner |
| `home.hero.section.after.carousel` | ヒーローセクション後のレスポンシブカルーセル広告<br/>PC：画像全面表示 / モバイル：正方形コンテナで画像完全表示 | 上部 | carousel |
| `home.features.section.after.inline` | 主要機能詳細セクション後（社会的証明セクション前） | 中部 | inline |
| `home.stats.section.after.infeed` | 統計・ランキングセクション後（ビジョンセクション前） | 下部 | infeed |

### 6.2 バトル一覧ページ

| キー | 説明 | 位置 | バリアント |
|------|------|------|------------|
| `battles.list.after-3.infeed` | アクティブバトル3件後 | リスト内 | infeed |
| `battles.list.after-10.infeed` | アクティブバトル10件後 | リスト内 | infeed |

### 6.3 ランキングページ

| キー | 説明 | 位置 | バリアント |
|------|------|------|------------|
| `ranking.top.banner` | トップランキング表示直下 | 上部 | banner |

### 6.4 配置場所の命名規則

```
{page}.{section}.{position}.{variant}

page: ページ名（home, battles, ranking, profile等）
section: セクション名（wordmark, features, stats, list等）
position: 位置（after, before, top, bottom等）
variant: 表示形式（banner, inline, infeed, carousel等）
```

---

## 7. 運用ガイドライン

### 7.1 広告作成フロー

#### ステップ1: 広告主登録
```sql
INSERT INTO advertisers (name, website_url, contact_email) VALUES
  ('株式会社ABC', 'https://abc.com', 'contact@abc.com');
```

#### ステップ2: 広告素材作成
```sql
INSERT INTO simple_ads (
  advertiser_id, title, description, image_url, click_url,
  contract_start_date, contract_end_date
) VALUES (
  '広告主UUID',
  '魅力的なタイトル（30文字以内）',
  '具体的なベネフィット説明（80文字以内）',
  'https://example.com/image.jpg',
  'https://example.com/landing',
  '2025-08-21',
  '2025-12-31'
);
```

#### ステップ3: 重み設定
```sql
-- 配信比率を重みで制御（placement assignmentは不要）
UPDATE advertisers 
SET weight = 30  -- 30% of total weight
WHERE name = '広告主名';
```

#### ステップ4: 配信開始
重み設定完了後、即座に配信開始。全ての配置場所で自動的に重み比例で配信されます。

### 7.2 日常運用

#### 配信状況確認
```sql
-- アクティブな広告一覧（簡素化版）
SELECT 
  sa.title,
  adv.name,
  adv.weight,
  sa.contract_end_date,
  ROUND((adv.weight * 100.0 / (SELECT SUM(weight) FROM advertisers WHERE is_active = true AND weight > 0)), 2) as expected_percentage
FROM simple_ads sa
JOIN advertisers adv ON sa.advertiser_id = adv.id
WHERE sa.is_active = true
AND sa.contract_start_date <= CURRENT_DATE
AND sa.contract_end_date >= CURRENT_DATE
AND adv.is_active = true
AND adv.weight > 0
ORDER BY adv.weight DESC;
```

#### 重み配分の確認
```sql
-- 現在の重み配分
SELECT 
  name,
  weight,
  ROUND((weight * 100.0 / (SELECT SUM(weight) FROM advertisers WHERE is_active = true AND weight > 0)), 2) as percentage
FROM advertisers 
WHERE is_active = true AND weight > 0
ORDER BY weight DESC;
```

#### 期限切れ広告の確認
```sql
-- 7日以内に期限が切れる広告
SELECT 
  sa.title,
  adv.name,
  sa.contract_end_date,
  CASE 
    WHEN sa.contract_end_date < CURRENT_DATE THEN '期限切れ'
    WHEN sa.contract_end_date <= CURRENT_DATE + INTERVAL '3 days' THEN '緊急'
    WHEN sa.contract_end_date <= CURRENT_DATE + INTERVAL '7 days' THEN '注意'
  END as status
FROM simple_ads sa
JOIN advertisers adv ON sa.advertiser_id = adv.id
WHERE sa.contract_end_date <= CURRENT_DATE + INTERVAL '7 days'
AND sa.is_active = true
ORDER BY sa.contract_end_date ASC;
```

### 7.3 画像・コンテンツガイドライン

#### 画像仕様
- **フォーマット**: JPEG, PNG, WebP
- **サイズ**: 最大1MB、推奨200KB以下
- **解像度**: 最低400x300px、Retina対応推奨
- **アスペクト比**: 配置場所に応じて調整
  - **Banner・Inline型**: 16:9〜3:2推奨
  - **InFeed型**: 4:3〜1:1推奨
  - **Carousel型**:
    - PC版: 16:9〜3:1（横長画像推奨）
    - モバイル版: 1:1〜4:3（正方形・縦長画像対応）

#### バリアント別画像ガイドライン

##### Carousel型の特別仕様
- **PC版表示**: 
  - `object-cover`で画像全面表示
  - 横長画像（1200x400px以上）を推奨
  - コンテナ高さに合わせて自動調整
- **モバイル版表示**:
  - `object-contain`で画像完全表示
  - 正方形画像（400x400px以上）も完全対応
  - カルーセル全体の高さを活用した正方形コンテナで表示
  - パディングによる余白確保で画像が切れることなく全体表示保証

#### コンテンツ基準
- **タイトル**: 15-30文字、キャッチーで具体的
- **説明文**: 40-80文字、ベネフィット重視
- **画像**: 高品質、ブランド統一性
- **リンク**: SSL必須、ランディングページ最適化

---

## 8. セキュリティ

### 8.1 認証・認可

#### 役割ベースアクセス制御
- **internal_admin**: 全機能へのフルアクセス
- **ad_ops**: 広告運用の全機能
- **viewer**: 閲覧のみ

#### JWTトークン構造
```json
{
  "sub": "user_uuid",
  "app_role": "ad_ops",
  "exp": 1640995200
}
```

### 8.2 データ保護

#### 入力値検証
- SQLインジェクション対策
- XSS攻撃防止
- CSRF保護
- URL検証（click_url、image_url）

#### RLS適用
```sql
-- 例: 広告素材のセキュリティポリシー
CREATE POLICY "ad_ops_manage_ads" ON simple_ads
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'app_role' IN ('internal_admin', 'ad_ops'));
```

---

## 9. トラブルシューティング

### 9.1 よくある問題

#### 問題: 広告が表示されない
**確認項目**:
1. 配置場所キーが正確か
2. 広告の契約期間内か
3. `is_active = true`になっているか
4. 配置割り当てが存在するか
5. RLSポリシーが正しく設定されているか

**解決手順**:
```sql
-- 配置場所の存在確認
SELECT * FROM ad_placements WHERE key = '問題のキー' AND is_active = true;

-- 該当配置の広告一覧
SELECT sa.title, sa.contract_start_date, sa.contract_end_date, sa.is_active
FROM simple_ads sa
JOIN ad_placement_assignments apa ON sa.id = apa.simple_ad_id
JOIN ad_placements ap ON apa.placement_id = ap.id
WHERE ap.key = '問題のキー';
```

#### 問題: Edge Functionエラー
**確認項目**:
1. Supabaseプロジェクトの接続状況
2. RLSポリシーの設定
3. 環境変数の設定
4. デプロイ状況

**ログ確認**:
```bash
# Supabaseログの確認
npx supabase functions logs ad-serve
```

### 9.2 パフォーマンス最適化

#### データベース最適化
```sql
-- インデックス使用状況の確認
EXPLAIN ANALYZE 
SELECT sa.* FROM simple_ads sa
JOIN ad_placement_assignments apa ON sa.id = apa.simple_ad_id
JOIN ad_placements ap ON apa.placement_id = ap.id
WHERE ap.key = 'home.wordmark.section.after.banner'
AND sa.is_active = true
AND sa.contract_start_date <= CURRENT_DATE
AND sa.contract_end_date >= CURRENT_DATE
ORDER BY apa.is_pinned DESC, apa.priority ASC;
```

#### フロントエンド最適化
- 画像の遅延読み込み
- AdSlotコンポーネントのメモ化
- 不要な再レンダリングの防止

---

## 10. 今後の拡張計画

### 10.1 短期計画（1-3ヶ月）

#### 管理UI改善
- 画像アップロード機能
- ドラッグ&ドロップでの優先度変更
- プレビュー機能
- 一括編集機能

#### レポート機能
- 配信実績の基本レポート
- 契約期間管理アラート
- 配置場所ごとの配信状況

### 10.2 中期計画（3-6ヶ月）

#### A/Bテスト機能
- 複数クリエイティブの比較テスト
- 配信比率の調整
- 効果測定

#### ターゲティング機能（簡易）
- デバイス別配信
- 時間帯制御
- ユーザー属性による配信制御

### 10.3 長期計画（6ヶ月以上）

#### 収益最適化
- 入札システム
- 自動価格調整
- CPM/CPC計測

#### 外部連携
- 第三者広告ネットワーク連携
- 広告効果測定ツール連携
- CRM連携

---

## 11. 付録

### 11.1 環境別設定

#### 開発環境
- **プロジェクトID**: `wdttluticnlqzmqmfvgt`
- **用途**: 機能開発・テスト
- **データ**: テストデータのみ

#### 本番環境
- **プロジェクトID**: `qgqcjtjxaoplhxurbpis`
- **用途**: 本番配信
- **データ**: 実際の広告データ

### 11.2 関連ドキュメント

- `docs/広告管理ガイドライン.md`: 運用担当者向けガイド
- `.cursor/docs/dev-rules/2025-08-21_シンプル広告システム実装.md`: 実装ログ
- `.cursor/docs/dev-rules/2025-08-21_ホームページ広告配置移行.md`: 配置移行ログ
- `.cursor/docs/dev-rules/2025-08-23_カルーセル広告画像のみ表示機能.md`: カルーセル広告レスポンシブ対応実装ログ
- `.cursor/docs/dev-rules/ad-system-simplification-log.md`: **重み付き広告システム簡素化実装ログ**

### 11.3 連絡先

- **技術的問題**: 開発チーム
- **広告運用**: 運営チーム  
- **緊急時対応**: システム管理者

---

**文書作成**: GitHub Copilot  
**最終更新**: 2025年8月23日（重み付き広告システム簡素化対応）  
**レビュー**: 運営チーム承認待ち
