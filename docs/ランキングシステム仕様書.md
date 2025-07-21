# BeatNexus ランキング機能仕様書

## 文書情報
- **作成日**: 2025年7月20日
- **バージョン**: 1.0
- **対象環境**: 本番環境・開発環境共通
- **最終更新**: バトル経験者フィルタリング機能実装

---

## 目次
1. [概要](#概要)
2. [ランキングの種類](#ランキングの種類)
3. [データベース設計](#データベース設計)
4. [ランキング表示ロジック](#ランキング表示ロジック)
5. [シーズン管理](#シーズン管理)
6. [フィルタリング仕様](#フィルタリング仕様)
7. [API仕様](#api仕様)
8. [UI/UX仕様](#uiux仕様)
9. [セキュリティ](#セキュリティ)
10. [パフォーマンス](#パフォーマンス)
11. [保守・運用](#保守運用)
12. [変更履歴](#変更履歴)

---

## 概要

BeatNexusのランキング機能は、ユーザーのバトル成績と投票活動を可視化し、コミュニティの競争要素を提供するシステムです。

### 主要機能
- **プレイヤーランキング**: バトル成績に基づくレーティングランキング
- **投票者ランキング**: 投票活動に基づくランキング
- **シーズン制**: 定期的なランキングリセットと記録保存
- **リアルタイム更新**: バトル結果・投票の即座反映

---

## ランキングの種類

### 1. プレイヤーランキング

#### 1.1 通算ランキング
- **概要**: 全期間を通じたレーティングランキング
- **評価指標**: レーティング（Eloシステム）
- **表示条件**: バトル経験者（勝敗数合計 >= 1）のみ
- **ソート順**: レーティング降順 → ユーザー名昇順

#### 1.2 シーズンランキング
- **概要**: 現在シーズンのポイントランキング
- **評価指標**: シーズンポイント
- **表示条件**: バトル経験者（勝敗数合計 >= 1）のみ
- **ソート順**: シーズンポイント降順 → ユーザー名昇順

#### 1.3 過去シーズンランキング
- **概要**: 終了したシーズンのアーカイブランキング
- **評価指標**: 当時の最終シーズンポイント
- **表示条件**: そのシーズンでバトル経験があったユーザーのみ
- **ソート順**: 最終順位昇順

### 2. 投票者ランキング

#### 2.1 通算投票者ランキング
- **概要**: 全期間を通じた投票活動ランキング
- **評価指標**: 総投票数
- **表示条件**: 投票経験者（vote_count >= 1）のみ
- **ソート順**: 投票数降順 → 作成日時昇順

#### 2.2 シーズン投票者ランキング
- **概要**: 現在シーズンの投票活動ランキング
- **評価指標**: シーズン投票ポイント
- **表示条件**: シーズン投票経験者（season_vote_points >= 1）のみ
- **ソート順**: シーズン投票ポイント降順 → 作成日時昇順

---

## データベース設計

### 3.1 プロフィールテーブル (profiles)

```sql
-- ユーザー基本情報とランキング関連データ
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar_url TEXT,
    rating INTEGER DEFAULT 1200,           -- 通算レーティング
    season_points INTEGER DEFAULT 1200,    -- 現在シーズンポイント
    vote_count INTEGER DEFAULT 0,          -- 通算投票数
    season_vote_points INTEGER DEFAULT 0,  -- シーズン投票ポイント
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 シーズンテーブル (seasons)

```sql
-- シーズン管理
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,     -- 例: "2025-S1", "HeartBeat"
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming/active/ended
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 シーズンランキングアーカイブ (season_rankings)

```sql
-- 終了シーズンのプレイヤーランキング記録
CREATE TABLE season_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    points INTEGER NOT NULL,               -- 最終シーズンポイント
    rank INTEGER NOT NULL,                 -- 最終順位
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, user_id)
);
```

### 3.4 シーズン投票者ランキングアーカイブ (season_voter_rankings)

```sql
-- 終了シーズンの投票者ランキング記録
CREATE TABLE season_voter_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    votes INTEGER NOT NULL,                -- 最終投票ポイント
    rank INTEGER NOT NULL,                 -- 最終順位
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, user_id)
);
```

### 3.5 バトル履歴テーブル (archived_battles)

```sql
-- バトル経験判定用
CREATE TABLE archived_battles (
    id UUID PRIMARY KEY,
    player1_user_id UUID REFERENCES profiles(id),
    player2_user_id UUID REFERENCES profiles(id),
    winner_id UUID REFERENCES profiles(id),  -- NULL = 引き分け
    player1_rating_change INTEGER,
    player2_rating_change INTEGER,
    season_id UUID REFERENCES seasons(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ランキング表示ロジック

### 4.1 ランキングビュー定義

#### 通算プレイヤーランキング (rankings_view)
```sql
CREATE VIEW rankings_view AS
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.rating,
  p.season_points,
  (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) AS battles_won,
  (SELECT count(*) FROM archived_battles ab 
   WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
   AND (ab.winner_id IS NOT NULL) 
   AND (ab.winner_id <> p.id)) AS battles_lost,
  rank() OVER (ORDER BY p.rating DESC, p.updated_at) AS rank
FROM profiles p
WHERE p.is_deleted = false
  AND (
    -- バトル経験者のみ: 勝利数 + 敗北数 >= 1
    (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) +
    (SELECT count(*) FROM archived_battles ab 
     WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
     AND (ab.winner_id IS NOT NULL) 
     AND (ab.winner_id <> p.id)) >= 1
  );
```

#### 通算投票者ランキング (voter_rankings_view)
```sql
CREATE VIEW voter_rankings_view AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.vote_count,
  dense_rank() OVER (ORDER BY p.vote_count DESC, p.created_at) AS rank
FROM profiles p
WHERE p.is_deleted = false
  AND p.vote_count >= 1;  -- 投票経験者のみ
```

### 4.2 フロントエンド表示ロジック

#### データ取得関数 (rankingStore)
```typescript
const getCurrentData = () => {
  if (activeTab === 'player') {
    const rankingType = activeRankingType;
    if (rankingType === 'current_season') {
      if (selectedSeasonId === currentSeason?.id) {
        return seasonRankings;
      } else {
        return historicalSeasonRankings.map(entry => ({
          user_id: entry.user_id,
          username: entry.username,
          avatar_url: entry.avatar_url,
          rating: entry.points,
          position: entry.rank,
          // ... その他のマッピング
        }));
      }
    } else {
      return rankings;
    }
  } else {
    // 投票者ランキング処理
    // ...
  }
};
```

---

## シーズン管理

### 5.1 シーズンライフサイクル

```mermaid
graph LR
    A[Upcoming] --> B[Active]
    B --> C[Ended]
    C --> D[Archived]
```

#### 5.1.1 シーズン開始
- 前シーズンの終了時に自動開始
- 全ユーザーの `season_points` を 1200 にリセット
- 全ユーザーの `season_vote_points` を 0 にリセット

#### 5.1.2 シーズン進行中
- バトル結果によるリアルタイムポイント更新
- 投票活動によるリアルタイムポイント加算

#### 5.1.3 シーズン終了
- **自動実行**: pg_cron により毎日 00:05 (UTC) に `end_current_season()` 実行
- **手動実行**: 管理者による任意タイミング実行

### 5.2 シーズン終了処理 (end_current_season関数)

```sql
CREATE OR REPLACE FUNCTION end_current_season()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_season RECORD;
  v_player_ranking_count INTEGER := 0;
  v_voter_ranking_count INTEGER := 0;
  -- 他の変数宣言...
BEGIN
  -- 1. アクティブシーズン取得
  SELECT * INTO v_current_season
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 2. バトルランキングアーカイブ（バトル経験者のみ）
  INSERT INTO season_rankings (season_id, user_id, points, rank)
  SELECT v_current_season.id, p.id, p.season_points,
         ROW_NUMBER() OVER (ORDER BY p.season_points DESC, p.username ASC)
  FROM profiles p
  WHERE p.is_deleted = FALSE
  AND (
    -- バトル経験者判定
    (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) +
    (SELECT count(*) FROM archived_battles ab 
     WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
     AND (ab.winner_id IS NOT NULL) 
     AND (ab.winner_id <> p.id)) >= 1
  );
  
  -- 3. 投票者ランキングアーカイブ（投票経験者のみ）
  INSERT INTO season_voter_rankings (season_id, user_id, votes, rank)
  SELECT v_current_season.id, id, season_vote_points,
         ROW_NUMBER() OVER (ORDER BY season_vote_points DESC, username ASC)
  FROM profiles
  WHERE is_deleted = FALSE
  AND season_vote_points >= 1;
  
  -- 4. シーズン終了処理
  UPDATE seasons SET status = 'ended', end_at = NOW() WHERE id = v_current_season.id;
  
  -- 5. ポイントリセット
  UPDATE profiles SET season_points = 1200, season_vote_points = 0 WHERE is_deleted = FALSE;
  
  -- 6. 次シーズン開始
  -- 新シーズン作成処理...
  
  RETURN json_build_object('success', true, /* ... */);
END;
$$;
```

---

## フィルタリング仕様

### 6.1 バトル経験者フィルタリング

**目的**: バトル未経験者（デフォルト1200ポイント）の大量表示を防止

**判定条件**:
```sql
-- バトル経験判定
(SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = user_id) +  -- 勝利数
(SELECT count(*) FROM archived_battles ab 
 WHERE ((ab.player1_user_id = user_id) OR (ab.player2_user_id = user_id)) 
 AND (ab.winner_id IS NOT NULL) 
 AND (ab.winner_id <> user_id)) >= 1  -- 敗北数
```

**適用箇所**:
- 通算プレイヤーランキング表示
- シーズンプレイヤーランキング表示
- シーズン終了時のアーカイブ処理

### 6.2 投票経験者フィルタリング

**目的**: 投票活動のないユーザーを投票者ランキングから除外

**判定条件**:
- 通算投票者ランキング: `vote_count >= 1`
- シーズン投票者ランキング: `season_vote_points >= 1`

**適用箇所**:
- 通算投票者ランキング表示
- シーズン投票者ランキング表示
- シーズン終了時のアーカイブ処理

### 6.3 削除ユーザーフィルタリング

**判定条件**: `is_deleted = FALSE`

**適用箇所**: 全ランキング表示・アーカイブ処理

---

## API仕様

### 7.1 ランキング取得API

#### エンドポイント
- `GET /api/rankings` - 通算プレイヤーランキング
- `GET /api/voter-rankings` - 通算投票者ランキング
- `GET /api/season-rankings` - シーズンプレイヤーランキング
- `GET /api/season-voter-rankings` - シーズン投票者ランキング
- `GET /api/historical-rankings/:seasonId` - 過去シーズンランキング

#### レスポンス形式
```typescript
interface RankingEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  rating?: number;           // プレイヤーランキングのみ
  season_points?: number;    // シーズンランキングのみ
  vote_count?: number;       // 投票者ランキングのみ
  battles_won?: number;      // プレイヤーランキングのみ
  battles_lost?: number;     // プレイヤーランキングのみ
  position: number;          // 順位
  rank?: number;             // ビューから取得される順位
}

interface RankingResponse {
  data: RankingEntry[];
  total: number;
  page?: number;
  pageSize?: number;
}
```

### 7.2 シーズン管理API

#### エンドポイント
- `GET /api/seasons` - シーズン一覧
- `GET /api/seasons/current` - 現在のアクティブシーズン
- `POST /api/admin/seasons/end` - シーズン終了（管理者限定）

---

## UI/UX仕様

### 8.1 ランキングページレイアウト

```
┌─────────────────────────────────────────┐
│ ランキングページ                         │
├─────────────────────────────────────────┤
│ [プレイヤー] [投票者] タブ切り替え        │
├─────────────────────────────────────────┤
│ [通算] [シーズン] [過去シーズン▼] 選択    │
├─────────────────────────────────────────┤
│ 🔍 検索ボックス                         │
├─────────────────────────────────────────┤
│ 🏆 TOP3 ポディウム表示                   │
├─────────────────────────────────────────┤
│ 📋 詳細ランキングリスト                  │
│   #4 ユーザー名 1,234pt [詳細]          │
│   #5 ユーザー名 1,200pt [詳細]          │
│   ...                                   │
└─────────────────────────────────────────┘
```

### 8.2 TopThreePodium仕様

**表示条件**: 
- 1位〜3位のユーザーが存在する場合に表示
- 3人未満でも柔軟に表示対応

**表示内容**:
- 順位バッジ（1位: 金、2位: 銀、3位: 銅）
- ユーザー名
- アバター画像
- ポイント数
- 詳細へのリンク

### 8.3 検索機能

**対象**: ユーザー名での部分一致検索
**リアルタイム**: 入力中の即座フィルタリング
**大文字小文字**: 区別しない

### 8.4 レスポンシブ対応

- **デスクトップ**: 3カラムレイアウト
- **タブレット**: 2カラムレイアウト  
- **モバイル**: 1カラムレイアウト

---

## セキュリティ

### 9.1 アクセス制御

**ランキング表示**: 認証不要（匿名ユーザーも閲覧可能）
**シーズン管理**: 管理者権限必須
**データベースビュー**: RLS（Row Level Security）適用

### 9.2 データ保護

**削除ユーザー**: `is_deleted = TRUE` でソフト削除
**個人情報**: ユーザー名とアバターのみ公開
**ランキング操作**: 不正なポイント操作の防止

---

## パフォーマンス

### 10.1 インデックス設計

```sql
-- profiles テーブル
CREATE INDEX idx_profiles_rating ON profiles(rating DESC, updated_at);
CREATE INDEX idx_profiles_season_points ON profiles(season_points DESC, username);
CREATE INDEX idx_profiles_vote_count ON profiles(vote_count DESC, created_at);
CREATE INDEX idx_profiles_is_deleted ON profiles(is_deleted);

-- archived_battles テーブル
CREATE INDEX idx_archived_battles_winner ON archived_battles(winner_id);
CREATE INDEX idx_archived_battles_player1 ON archived_battles(player1_user_id);
CREATE INDEX idx_archived_battles_player2 ON archived_battles(player2_user_id);
CREATE INDEX idx_archived_battles_season ON archived_battles(season_id);

-- season_rankings テーブル
CREATE INDEX idx_season_rankings_season ON season_rankings(season_id, rank);
CREATE INDEX idx_season_rankings_user ON season_rankings(user_id);
```

### 10.2 キャッシュ戦略

**フロントエンド**: Zustand によるクライアントサイドキャッシュ
**データベース**: ビューのマテリアライゼーション検討
**更新頻度**: バトル結果・投票時のリアルタイム更新

---

## 保守・運用

### 11.1 監視項目

- **シーズン終了処理**: pg_cron ジョブの実行状況
- **ランキング更新**: バトル後のポイント反映
- **データ整合性**: アーカイブデータの正確性
- **パフォーマンス**: クエリ実行時間の監視

### 11.2 定期メンテナンス

- **データクリーンアップ**: 不正アーカイブデータの削除
- **インデックス最適化**: 定期的なREINDEX実行
- **統計情報更新**: ANALYZE の定期実行

### 11.3 バックアップ・復旧

- **データベースバックアップ**: 毎日の自動バックアップ
- **ポイントアウト復旧**: 重要データの定期エクスポート
- **災害復旧**: 複数リージョンでのデータ保護

---

## 変更履歴

### Version 1.0 (2025-07-20)
- **初版作成**: 基本ランキング機能の仕様策定
- **バトル経験者フィルタリング実装**: 
  - 問題: デフォルト1200ポイントのバトル未経験者がランキングに大量表示
  - 解決: バトル参加回数（勝敗数合計 >= 1）による正確なフィルタリング
- **投票経験者フィルタリング実装**:
  - 投票未経験者（vote_count = 0）を投票者ランキングから除外
- **シーズン終了処理修正**:
  - アーカイブ対象を経験者のみに限定
  - 不正データの新規生成を防止
- **ランキングビュー修正**:
  - `rankings_view`: バトル経験者のみ表示
  - `voter_rankings_view`: 投票経験者のみ表示
  - `season_voter_rankings_view`: シーズン投票経験者のみ表示

### 適用環境
- **開発環境** (wdttluticnlqzmqmfvgt): ✅ 適用済み
- **本番環境** (qgqcjtjxaoplhxurbpis): ✅ 適用済み

### 今後の改善予定
- 既存不正アーカイブデータのクリーンアップ検討
- ランキング変動履歴の可視化
- 詳細統計情報の提供
- ランキング予測機能の追加

---

**文書終了**

*この仕様書は BeatNexus ランキング機能の完全な技術仕様を記録したものです。機能の追加・変更時は本文書の更新を必須とします。*
