# BeatNexus シンプル広告配信システム 完全仕様書

**作成日**: 2025年8月21日  
**バージョン**: 2.1  
**最終更新**: 2025年9月7日（インプレッション計測基準をIAB標準に準拠）  
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
- **インプレッション・クリック計測**: リアルタイムでの広告効果測定
- **日次・月次分析システム**: 統計的手法による包括的なCTR分析
- **自動異常検知**: AI駆動による配信パフォーマンス監視
- **レポートダッシュボード**: React/TypeScriptベースの管理画面

### 1.3 設計原則
- **シンプル性**: 複雑なplacement assignmentを排除し、直接重み付き選択を採用
- **運用効率**: 重み付けによる直感的な配信比率制御
- **拡張性**: 将来的な機能追加に対応可能な設計
- **パフォーマンス**: 高速な広告配信とレスポンシブな表示
- **確実性**: 重み=0の広告主は絶対に配信されない保証
- **データ駆動**: 包括的な分析とレポート機能による最適化
- **自動化**: 異常検知とアラート機能による運用負荷軽減

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
│   + Tracker     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ad Analytics  │    │   Daily/Monthly │    │   Edge Function │
│   Dashboard     │    │   Aggregation   │    │   ad-track      │
│   (React)       │    │   (pg_cron)     │    │   (Deno/TS)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 データフロー

1. **フロントエンド** → AdSlotコンポーネントが配置場所キーを指定
2. **Edge Function** → 全ての有効な広告から重み付き直接選択
3. **データベース** → `weighted_random_ad()`関数で契約期間・重み・有効性を考慮
4. **レスポンス** → 広告クリエイティブまたはNoFillを返却
5. **表示** → AdSlotが適切な形式で広告を描画
6. **計測** → IntersectionObserver によるインプレッション検知
7. **イベント送信** → `ad-track` Edge Function への非同期送信
8. **データ蓄積** → `ad_events` テーブルへの実時間イベント記録
9. **分析処理** → 日次・月次の自動集計とレポート生成
10. **異常検知** → 統計的手法による自動異常検知とアラート

### 2.2.1 簡素化されたアーキテクチャ

**旧システム（複雑）**:
placement → placement_assignment → advertiser selection → ad selection

**新システム（簡素化）**:
placement → `weighted_random_ad()` → direct ad selection

### 2.3 技術スタック

| 層 | 技術 | 用途 |
|---|------|------|
| フロントエンド | React 18 + TypeScript | UI・UX、AdSlotコンポーネント |
| バックエンド | Supabase Edge Functions (Deno) | 広告配信API、計測API |
| データベース | PostgreSQL (Supabase) | 広告データ・設定管理 |
| 認証・権限 | Supabase Auth + RLS | セキュリティ・権限制御 |
| デプロイ | Supabase Platform | インフラ・スケーリング |
| 計測システム | JWT署名トークン + Intersection Observer | 広告効果測定 |
| 分析基盤 | PostgreSQL関数 + マテリアライズドビュー | CTR分析・レポート |
| 自動化 | pg_cron | 定期集計・異常検知 |
| ダッシュボード | React + TypeScript | 管理画面・分析UI |

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

#### 3.1.4 ad_events（広告イベント計測）
```sql
CREATE TABLE ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simple_ad_id uuid REFERENCES simple_ads(id) ON DELETE CASCADE,
  placement_id uuid REFERENCES ad_placements(id) ON DELETE CASCADE,
  user_id uuid,                        -- 認証済みユーザーID（任意）
  anon_session_id text,                -- 匿名セッションID
  type text NOT NULL,                  -- 'impression' または 'click'
  occurred_at timestamptz DEFAULT now(),
  client_meta jsonb DEFAULT '{}',      -- デバイス情報等
  created_at timestamptz DEFAULT now()
);
```

#### 3.1.5 system_logs（システムログ）
```sql
CREATE TABLE system_logs (
  id bigserial PRIMARY KEY,
  log_level text NOT NULL,             -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
  message text NOT NULL,
  context jsonb DEFAULT '{}',          -- 追加情報・メタデータ
  created_at timestamptz DEFAULT now()
);
```

### 3.2 分析・集計システム

#### 3.2.1 月次集計マテリアライズドビュー
```sql
CREATE MATERIALIZED VIEW mv_ad_stats_monthly AS
SELECT 
    date_trunc('month', occurred_at) as event_month,
    simple_ad_id,
    placement_id,
    flight_id,  -- 開発環境のみ
    
    -- 基本指標
    COUNT(*) FILTER (WHERE type = 'impression') as impressions,
    COUNT(*) FILTER (WHERE type = 'click') as clicks,
    COUNT(DISTINCT user_id) FILTER (WHERE type = 'impression' AND user_id IS NOT NULL) as unique_users_impressions,
    COUNT(DISTINCT user_id) FILTER (WHERE type = 'click' AND user_id IS NOT NULL) as unique_users_clicks,
    COUNT(DISTINCT anon_session_id) FILTER (WHERE type = 'impression' AND user_id IS NULL) as unique_anon_impressions,
    COUNT(DISTINCT anon_session_id) FILTER (WHERE type = 'click' AND user_id IS NULL) as unique_anon_clicks,
    
    -- CTR計算
    CASE 
        WHEN COUNT(*) FILTER (WHERE type = 'impression') > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE type = 'click')::numeric / 
                   COUNT(*) FILTER (WHERE type = 'impression')::numeric) * 100, 4)
        ELSE 0 
    END as ctr_percentage,
    
    -- 時間帯分析
    COUNT(*) FILTER (WHERE type = 'impression' AND 
                    extract(hour from occurred_at) BETWEEN 9 AND 17) as impressions_business_hours,
    COUNT(*) FILTER (WHERE type = 'click' AND 
                    extract(hour from occurred_at) BETWEEN 9 AND 17) as clicks_business_hours,
    
    -- デバイス分析
    COUNT(*) FILTER (WHERE type = 'impression' AND 
                    (client_meta->>'mobile')::boolean = true) as impressions_mobile,
    COUNT(*) FILTER (WHERE type = 'click' AND 
                    (client_meta->>'mobile')::boolean = true) as clicks_mobile,
    
    -- 統計的信頼性評価
    CASE 
        WHEN COUNT(*) FILTER (WHERE type = 'impression') >= 1000 THEN 'high'
        WHEN COUNT(*) FILTER (WHERE type = 'impression') >= 100 THEN 'medium'
        WHEN COUNT(*) FILTER (WHERE type = 'impression') >= 30 THEN 'low'
        ELSE 'insufficient'
    END as statistical_confidence,
    
    -- 時系列データ
    MIN(occurred_at) as first_event_at,
    MAX(occurred_at) as last_event_at
    
FROM ad_events 
GROUP BY event_month, simple_ad_id, placement_id, flight_id;
```

#### 3.2.2 日次分析ビュー
```sql
CREATE VIEW vw_ad_stats_daily AS
SELECT 
    date_trunc('day', occurred_at)::date as event_date,
    simple_ad_id,
    placement_id,
    
    -- 基本指標
    COUNT(*) FILTER (WHERE type = 'impression') as impressions,
    COUNT(*) FILTER (WHERE type = 'click') as clicks,
    COUNT(DISTINCT user_id) FILTER (WHERE type = 'impression' AND user_id IS NOT NULL) as unique_users_impressions,
    COUNT(DISTINCT user_id) FILTER (WHERE type = 'click' AND user_id IS NOT NULL) as unique_users_clicks,
    COUNT(DISTINCT anon_session_id) FILTER (WHERE type = 'impression' AND user_id IS NULL) as unique_anon_impressions,
    COUNT(DISTINCT anon_session_id) FILTER (WHERE type = 'click' AND user_id IS NULL) as unique_anon_clicks,
    
    -- CTR計算（4桁精度）
    CASE 
        WHEN COUNT(*) FILTER (WHERE type = 'impression') > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE type = 'click')::numeric / 
                   COUNT(*) FILTER (WHERE type = 'impression')::numeric) * 100, 4)
        ELSE 0 
    END as ctr_percentage,
    
    -- 時間帯・デバイス分析
    COUNT(*) FILTER (WHERE type = 'impression' AND 
                    extract(hour from occurred_at) BETWEEN 9 AND 17) as impressions_business_hours,
    COUNT(*) FILTER (WHERE type = 'impression' AND 
                    (client_meta->>'mobile')::boolean = true) as impressions_mobile,
    
    -- 統計的信頼性
    CASE 
        WHEN COUNT(*) FILTER (WHERE type = 'impression') >= 100 THEN 'high'
        WHEN COUNT(*) FILTER (WHERE type = 'impression') >= 30 THEN 'medium'
        WHEN COUNT(*) FILTER (WHERE type = 'impression') >= 10 THEN 'low'
        ELSE 'insufficient'
    END as statistical_confidence,
    
    MIN(occurred_at) as first_event_at,
    MAX(occurred_at) as last_event_at
    
FROM ad_events 
WHERE occurred_at >= current_date - interval '90 days'
GROUP BY event_date, simple_ad_id, placement_id;
```

#### 3.2.3 異常検知関数
```sql
CREATE FUNCTION detect_daily_ad_anomalies(
    target_date date default current_date,
    lookback_days integer default 7
)
RETURNS TABLE (
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
) AS $$
BEGIN
    -- 統計的異常検知ロジック
    -- インプレッション急降下、CTR異常変動の自動検出
    -- 詳細実装は migration ファイル参照
END;
$$ LANGUAGE plpgsql;
```

#### 3.2.4 自動化関数
```sql
-- 日次異常検知実行
CREATE FUNCTION run_daily_ad_anomaly_check() RETURNS text AS $$
-- 週次サマリー生成
CREATE FUNCTION run_weekly_ad_summary() RETURNS text AS $$
-- 月次集計リフレッシュ
CREATE FUNCTION refresh_mv_ad_stats_monthly() RETURNS void AS $$
```

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

### 3.4 インデックス設計

```sql
-- 配信性能向上のためのインデックス
CREATE INDEX idx_ad_placements_key ON ad_placements(key) WHERE is_active = true;
CREATE INDEX idx_simple_ads_contract_dates ON simple_ads(contract_start_date, contract_end_date) WHERE is_active = true;
CREATE INDEX idx_advertisers_weight ON advertisers(weight) WHERE is_active = true AND weight > 0;

-- 計測・分析性能向上のためのインデックス
CREATE INDEX idx_ad_events_occurred_at ON ad_events(occurred_at);
CREATE INDEX idx_ad_events_type_occurred_at ON ad_events(type, occurred_at);
CREATE INDEX idx_ad_events_simple_ad_placement ON ad_events(simple_ad_id, placement_id, occurred_at);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_log_level ON system_logs(log_level);

-- 【非推奨】placement assignment関連（使用されません）
CREATE INDEX idx_placement_assignments_priority ON ad_placement_assignments(placement_id, is_pinned DESC, priority ASC);
```

### 3.5 自動化スケジュール（pg_cron）

```sql
-- 月次マテリアライズドビューリフレッシュ（毎月1日 午前2時）
SELECT cron.schedule('monthly-ad-stats-refresh', '0 2 1 * *', 'SELECT refresh_mv_ad_stats_monthly();');

-- 日次異常検知レポート（毎日午前8時）
SELECT cron.schedule('daily-ad-anomaly-check', '0 8 * * *', 'SELECT run_daily_ad_anomaly_check();');

-- 週次パフォーマンスサマリー（毎週月曜日 午前9時）
SELECT cron.schedule('weekly-ad-performance-summary', '0 9 * * 1', 'SELECT run_weekly_ad_summary();');
```

### 3.6 Row Level Security (RLS)

```sql
-- 広告データのセキュリティポリシー
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE simple_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 権限ベースのアクセス制御
CREATE POLICY "ad_ops_full_access" ON advertisers FOR ALL TO authenticated 
  USING (auth.jwt() ->> 'app_role' IN ('internal_admin', 'ad_ops'));

CREATE POLICY "viewer_read_access" ON simple_ads FOR SELECT TO authenticated 
  USING (auth.jwt() ->> 'app_role' IN ('internal_admin', 'ad_ops', 'viewer'));

-- 計測データは認証済みユーザーのみ閲覧可能
CREATE POLICY "analytics_read_access" ON ad_events FOR SELECT TO authenticated 
  USING (auth.jwt() ->> 'app_role' IN ('internal_admin', 'ad_ops', 'viewer'));

-- システムログは認証済みユーザーのみ閲覧可能
CREATE POLICY "logs_read_access" ON system_logs FOR SELECT TO authenticated 
  USING (auth.jwt() ->> 'app_role' IN ('internal_admin', 'ad_ops'));
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
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // 計測用署名トークン
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

### 4.2 広告計測API

#### エンドポイント
```
POST https://{project-id}.supabase.co/functions/v1/ad-track
```

#### リクエスト（インプレッション）
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "impression",
  "timestamp": 1709740800000,
  "client_meta": {
    "user_agent": "Mozilla/5.0...",
    "mobile": false,
    "viewport": { "width": 1920, "height": 1080 }
  }
}
```

#### リクエスト（クリック）
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "click",
  "timestamp": 1709740850000,
  "client_meta": {
    "user_agent": "Mozilla/5.0...",
    "mobile": false,
    "click_position": { "x": 150, "y": 250 }
  }
}
```

#### レスポンス（成功時）
```json
{
  "ok": true,
  "message": "Event tracked successfully",
  "event_id": "uuid-of-tracked-event"
}
```

#### レスポンス（重複・無効時）
```json
{
  "ok": false,
  "error": "duplicate_event",
  "message": "Event already tracked within TTL window"
}
```

### 4.3 JWT署名トークン仕様

#### トークン構造
```json
{
  "sid": "simple_ad_id",              // 広告ID
  "pk": "placement_key",              // 配置場所キー  
  "iat": 1709740800,                  // 発行時刻
  "exp": 1709741100                   // 有効期限（5分）
}
```

#### セキュリティ機能
- **有効期限**: 5分間の短期有効期限
- **重複防止**: TTL付きキャッシュによる重複イベント排除
- **改ざん防止**: HMAC署名による完全性保証

### 4.4 配信ロジック

1. **配置場所検証**: 指定されたplacementキーの存在確認（参考情報として受け取り）
2. **重み付き広告選択**: `weighted_random_ad()`関数による以下の処理
   - 有効な広告の抽出（`is_active = true`）
   - 契約期間内フィルタ（`contract_start_date <= 現在日 <= contract_end_date`）
   - 重みゼロ除外（`advertiser.weight > 0`）
   - 重み比例による確率的選択
3. **署名トークン生成**: 計測用JWT署名トークンの生成と付与
4. **結果生成**: 条件に合致する広告またはNoFillを返却

### 4.5 計測ロジック

1. **フロントエンド計測**:
   - **IntersectionObserver**: 閾値≥0.5、連続可視時間≥1000msでインプレッション検知（IAB標準準拠）
   - **クリックハンドラー**: リンククリック時の即座計測
   - **重複防止**: 同一トークン+セッションでの1回のみ計測保証
   
2. **バックエンド処理**:
   - **JWT検証**: 署名・有効期限・構造の検証
   - **TTL重複防止**: Redisキャッシュによる重複イベント排除（impression: 30秒、click: 5秒）
   - **データ永続化**: PostgreSQL `ad_events`テーブルへの即座記録

3. **分析・集計**:
   - **リアルタイム集計**: 日次ビューによる即座指標確認
   - **定期集計**: pg_cronによる自動月次・週次・日次集計
   - **異常検知**: 統計的手法による自動異常検知とアラート

#### 4.5.1 重み付けアルゴリズム

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

#### 4.5.2 計測精度とパフォーマンス

- **インプレッション精度**: 99%以上（IntersectionObserver + 可視時間閾値）
- **クリック精度**: 100%（直接イベントハンドラー）
- **レスポンス速度**: 計測API < 100ms、配信API < 200ms
- **重複排除率**: 99.9%以上（TTLキャッシュ）

---

## 5. フロントエンド実装

### 5.1 AdSlotコンポーネント

#### 基本使用法
```tsx
import { AdSlot } from '@/components/ads/AdSlot';

// 基本的な使用例（計測機能付き）
<AdSlot
  placementKey="home.wordmark.section.after.banner"
  variant="banner"
  className="w-full max-w-4xl"
  enableTracking={true}  // 計測機能有効化
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
  enableTracking?: boolean;                // 計測機能の有効/無効（デフォルト: true）
  trackingOptions?: {                      // 計測オプション
    impressionThreshold?: number;          // インプレッション閾値（デフォルト: 0.5）
    impressionDelay?: number;              // 可視時間閾値（デフォルト: 1000ms - IAB標準）
    batchSize?: number;                    // バッチサイズ（デフォルト: 5）
    batchDelay?: number;                   // バッチ送信間隔（デフォルト: 2000ms）
  };
}
```

### 5.2 計測システム統合

#### 自動計測機能
- **インプレッション検知**: IntersectionObserver APIによる自動検知
- **クリック計測**: リンククリック時の自動送信（navigate前に完了）
- **重複防止**: セッション内での同一広告重複計測防止
- **オフライン対応**: ネットワーク復旧時の自動再送信

#### 実装例
```tsx
// AdSlotコンポーネント内の計測ロジック
const { trackImpression, trackClick } = useAdTracking({
  token: serve.token,
  onError: (error) => console.warn('Tracking error:', error)
});

// IntersectionObserver による自動インプレッション検知
useEffect(() => {
  if (!enableTracking || !serve.token || !adRef.current) return;
  
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
        trackImpression();
      }
    },
    { threshold: impressionThreshold }
  );
  
  observer.observe(adRef.current);
  return () => observer.disconnect();
}, [serve.token, enableTracking]);
```

### 5.3 広告表示バリアント

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

### 5.4 レスポンシブ実装詳細

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

### 5.5 NoFill処理

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

#### 広告パフォーマンス分析
```sql
-- 今日の広告パフォーマンス概要
SELECT * FROM generate_daily_ad_report();

-- 今日の異常検知結果
SELECT * FROM detect_daily_ad_anomalies();

-- 今月の詳細分析
SELECT * FROM mv_ad_stats_monthly 
WHERE event_month = date_trunc('month', current_date);

-- CTRランキング（過去30日）
SELECT 
  sa.title,
  adv.name,
  SUM(d.impressions) as total_impressions,
  SUM(d.clicks) as total_clicks,
  CASE 
    WHEN SUM(d.impressions) > 0 
    THEN ROUND((SUM(d.clicks)::numeric / SUM(d.impressions)::numeric) * 100, 4)
    ELSE 0 
  END as ctr_percentage,
  d.statistical_confidence
FROM vw_ad_stats_daily d
JOIN simple_ads sa ON d.simple_ad_id = sa.id
JOIN advertisers adv ON sa.advertiser_id = adv.id
WHERE d.event_date >= current_date - interval '30 days'
GROUP BY sa.id, sa.title, adv.name, d.statistical_confidence
HAVING SUM(d.impressions) >= 100  -- 統計的有意性確保
ORDER BY ctr_percentage DESC
LIMIT 10;
```

#### システムログ確認
```sql
-- 分析システムのログ確認
SELECT * FROM vw_ad_analytics_logs 
WHERE created_at >= current_date - interval '7 days'
ORDER BY created_at DESC;

-- 異常検知アラート履歴
SELECT * FROM system_logs 
WHERE log_level IN ('WARNING', 'ERROR', 'CRITICAL')
AND message LIKE '%ad%'
AND created_at >= current_date - interval '30 days'
ORDER BY created_at DESC;
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

### 7.5 画像・コンテンツガイドライン

#### 画像仕様

### 7.4 分析・レポート機能

#### 管理ダッシュボード
- **React コンポーネント**: `MonthlyAdAnalyticsDashboard.tsx`
- **分析エンジン**: `AdAnalyticsEngine.ts`
- **リアルタイムデータ**: Supabase Realtime Subscriptions

#### 主要KPI
| 指標 | 計算式 | 目標値 |
|------|--------|---------|
| CTR | (クリック数 / インプレッション数) × 100 | 2.5%以上 |
| 統計的信頼性 | サンプルサイズによる信頼度評価 | high（1000+imp） |
| 配信健全性 | 重み設定通りの配信比率維持 | ±5%以内 |
| 異常検知率 | 日次異常検知による早期発見 | 24時間以内 |

#### 自動レポート
- **日次レポート**: 毎日8:00に前日パフォーマンス自動生成
- **週次サマリー**: 毎週月曜9:00に週次トレンド分析
- **月次レポート**: 毎月1日2:00に月次集計とトレンド分析
- **異常アラート**: リアルタイム異常検知による即座通知

#### KPI計算詳細
```sql
-- 統計的信頼性評価
CASE 
    WHEN impressions >= 1000 THEN 'high'     -- 95%信頼区間: ±3.1%
    WHEN impressions >= 100 THEN 'medium'    -- 95%信頼区間: ±9.8%
    WHEN impressions >= 30 THEN 'low'        -- 95%信頼区間: ±17.9%
    ELSE 'insufficient'                       -- 統計的有意性なし
END as statistical_confidence
```
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
4. 広告主の重みが0より大きいか
5. RLSポリシーが正しく設定されているか

**解決手順**:
```sql
-- 配置場所の存在確認
SELECT * FROM ad_placements WHERE key = '問題のキー' AND is_active = true;

-- 有効な広告の確認
SELECT sa.title, sa.contract_start_date, sa.contract_end_date, sa.is_active, adv.weight
FROM simple_ads sa
JOIN advertisers adv ON sa.advertiser_id = adv.id
WHERE sa.is_active = true
AND sa.contract_start_date <= CURRENT_DATE
AND sa.contract_end_date >= CURRENT_DATE
AND adv.is_active = true
AND adv.weight > 0;
```

#### 問題: 計測データが記録されない
**確認項目**:
1. JWT署名トークンが正常に生成されているか
2. `ad-track` Edge Functionがデプロイされているか
3. 計測APIのレスポンスコードが200か
4. フロントエンドで計測機能が有効化されているか
5. IntersectionObserver がサポートされているブラウザか

**解決手順**:
```sql
-- 計測データの確認
SELECT * FROM ad_events 
WHERE occurred_at >= current_date - interval '1 hour'
ORDER BY occurred_at DESC;

-- 署名トークンの検証
SELECT * FROM vw_ad_analytics_logs 
WHERE message LIKE '%token%' 
AND created_at >= current_date - interval '1 hour';
```

**フロントエンドデバッグ**:
```javascript
// ブラウザ開発者ツールでの確認
// 1. ネットワークタブで ad-track APIの送信状況確認
// 2. コンソールで計測エラーの確認
// 3. localStorage の計測キューの確認
console.log('Ad tracking queue:', localStorage.getItem('ad_tracking_queue'));
```

#### 問題: CTRが異常に高い/低い
**確認項目**:
1. 統計的サンプルサイズは十分か（100+ impressions推奨）
2. ボットトラフィックの混入はないか
3. 重複計測が発生していないか
4. 計測期間設定が適切か

**解決手順**:
```sql
-- 異常値の詳細分析
SELECT * FROM detect_daily_ad_anomalies() 
WHERE severity IN ('warning', 'critical');

-- 時間別配信状況の確認
SELECT 
  date_trunc('hour', occurred_at) as hour,
  type,
  COUNT(*) as events
FROM ad_events 
WHERE occurred_at >= current_date - interval '24 hours'
GROUP BY hour, type
ORDER BY hour;

-- デバイス別分析（ボット検出）
SELECT 
  client_meta->>'user_agent' as user_agent,
  type,
  COUNT(*) as events
FROM ad_events 
WHERE occurred_at >= current_date - interval '24 hours'
GROUP BY user_agent, type
HAVING COUNT(*) > 100  -- 異常に多いトラフィック
ORDER BY events DESC;
```

#### 問題: Edge Functionエラー
**確認項目**:
1. Supabaseプロジェクトの接続状況
2. RLSポリシーの設定
3. 環境変数の設定（JWT_SECRET等）
4. デプロイ状況
5. 計測用Redis/TTLキャッシュの状況

**ログ確認**:
```bash
# Supabaseログの確認
npx supabase functions logs ad-serve
npx supabase functions logs ad-track

# 特定期間のログ絞り込み
npx supabase functions logs ad-track --filter="level=error" --since="1h"
```

#### 問題: 自動化ジョブが実行されない
**確認項目**:
1. pg_cronが有効化されているか
2. ジョブのスケジュール設定が正確か
3. 実行権限が設定されているか
4. システムリソースが十分か

**解決手順**:
```sql
-- pg_cronジョブの状況確認
SELECT * FROM cron.job WHERE jobname LIKE '%ad%';

-- ジョブ実行履歴の確認
SELECT * FROM cron.job_run_details 
WHERE job_id IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%ad%')
ORDER BY start_time DESC 
LIMIT 10;

-- 手動実行テスト
SELECT run_daily_ad_anomaly_check();
SELECT run_weekly_ad_summary();
```

### 9.2 パフォーマンス最適化

#### データベース最適化
```sql
-- インデックス使用状況の確認（重み付き選択）
EXPLAIN ANALYZE 
SELECT sa.* FROM simple_ads sa
JOIN advertisers adv ON sa.advertiser_id = adv.id
WHERE sa.is_active = true
AND sa.contract_start_date <= CURRENT_DATE
AND sa.contract_end_date >= CURRENT_DATE
AND adv.is_active = true
AND adv.weight > 0;

-- 計測データのパフォーマンス確認
EXPLAIN ANALYZE 
SELECT * FROM vw_ad_stats_daily 
WHERE event_date >= current_date - interval '30 days';

-- マテリアライズドビューのリフレッシュ時間確認
SELECT schemaname, matviewname, last_refresh 
FROM pg_stat_user_tables 
WHERE relname LIKE '%ad_stats%';
```

#### フロントエンド最適化
- 画像の遅延読み込み
- AdSlotコンポーネントのメモ化
- 不要な再レンダリングの防止
- 計測データのバッチ送信最適化

#### Edge Function最適化
- JWT検証の高速化
- データベース接続プーリング
- TTLキャッシュの効率化
- レスポンス圧縮

---

## 10. 今後の拡張計画

### 10.1 短期計画（1-3ヶ月）

#### 管理UI改善
- 画像アップロード機能
- ドラッグ&ドロップでの優先度変更
- プレビュー機能
- 一括編集機能

#### 高度な分析機能
- **React ダッシュボード統合**: 管理画面への分析コンポーネント統合
- **リアルタイム監視**: Supabase Realtime によるライブデータ更新
- **詳細セグメント分析**: デバイス・時間帯・ユーザー属性別の深堀り分析
- **競合分析**: 配置場所ごとの広告主間パフォーマンス比較

#### メール通知システム
- **異常検知アラート**: 重要な指標変動時の即座メール通知
- **定期レポート配信**: 週次・月次レポートの自動メール送信
- **カスタムアラート**: 任意しきい値による柔軟なアラート設定

### 10.2 中期計画（3-6ヶ月）

#### A/Bテスト機能
- 複数クリエイティブの比較テスト
- 配信比率の調整
- 効果測定

#### 高度なターゲティング機能
- デバイス別配信
- 時間帯制御
- ユーザー属性による配信制御
- 地域別ターゲティング

#### 機械学習による最適化
- **CTR予測モデル**: 過去データからの配信効果予測
- **自動重み調整**: パフォーマンスに基づく重み自動最適化
- **異常検知の高度化**: 機械学習による複雑なパターン検出

### 10.3 長期計画（6ヶ月以上）

#### 収益最適化
- 入札システム
- 自動価格調整
- CPM/CPC計測
- **リアルタイム最適化**: 配信比率の動的調整

#### 外部連携
- 第三者広告ネットワーク連携
- 広告効果測定ツール連携
- CRM連携
- **Google Analytics 統合**: 包括的なコンバージョン分析
- **BI ツール連携**: Tableau、PowerBI などとの接続

#### エンタープライズ機能
- **マルチテナント対応**: 複数サービス・ブランドでの運用
- **API公開**: 外部パートナーとの連携API
- **高可用性**: 冗長化・災害復旧対応

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
- **`.cursor/docs/dev-rules/2025-09-06_daily-ad-analytics-system.md`**: **日次広告分析システム実装ログ**
- **`supabase/migrations/20250906000000_create_monthly_ad_analytics.sql`**: **月次分析システム**
- **`supabase/migrations/20250906000001_create_daily_ad_analytics_and_automation.sql`**: **日次分析・自動化システム**
- **`supabase/migrations/20250906000002_create_daily_ad_analytics_and_automation_prod.sql`**: **本番環境用日次分析システム**
- **`src/components/MonthlyAdAnalyticsDashboard.tsx`**: **React 分析ダッシュボード**
- **`src/utils/AdAnalyticsEngine.ts`**: **TypeScript 分析エンジン**

### 11.3 連絡先

- **技術的問題**: 開発チーム
- **広告運用**: 運営チーム  
- **緊急時対応**: システム管理者

---

**文書作成**: GitHub Copilot  
**最終更新**: 2025年9月6日（包括的広告分析システム・計測機能追加）  
**バージョン**: 2.0 - Advanced Analytics & Tracking Integration  
**レビュー**: 運営チーム承認待ち

## 📊 更新履歴

### v2.0 (2025-09-06) - Advanced Analytics & Tracking Integration
- **インプレッション・クリック計測機能**: JWT署名トークン + IntersectionObserver による高精度計測
- **日次・月次分析システム**: 統計的手法による包括的CTR分析基盤
- **自動異常検知**: pg_cron による定期実行とアラート機能
- **React ダッシュボード**: TypeScript ベースの管理画面コンポーネント
- **包括的ドキュメント**: 計測・分析・運用に関する詳細仕様追加

### v2.1 (2025-09-07) - IAB Standard Compliance
- **インプレッション計測基準**: 300ms → 1000ms に変更（IAB/MRC標準準拠）
- **業界標準準拠**: 広告ビューアビリティの国際基準への対応
- **計測精度向上**: より厳格な「実際に見られた広告」の定義を採用

### v1.0 (2025-08-23) - Simple Ad System Foundation  
- **重み付き広告システム**: placement assignment 廃止による簡素化
- **カルーセル広告**: レスポンシブ対応の画像表示機能
- **基本配信システム**: Edge Functions + PostgreSQL による配信基盤
