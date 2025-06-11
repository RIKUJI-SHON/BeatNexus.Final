# 🎵 BeatNexus Cursor Rules

## 🎯 プロジェクト概要
**BeatNexus**は、ビートボクシング愛好者向けの競技プラットフォームです。
- **投稿型バトル**: 動画投稿 → 自動マッチング → コミュニティ投票 → 勝者決定
- **レーティングシステム**: 戦績ベースの個人レーティングとシーズンランキング
- **投票者ランキング**: コミュニティ貢献度を評価する投票数ベースのランキング
- **コミュニティ**: リアルタイム通知、コメント、フォーラム機能
- **多言語対応**: 日本語・英語完全対応

## 🛠️ 技術スタック
- **フロントエンド**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **バックエンド**: Supabase (PostgreSQL + Edge Functions + Storage + Auth)
- **定期処理**: pg_cron（5分間隔でバトル終了処理）
- **国際化**: react-i18next
- **デプロイ**: Supabase（開発用プロジェクトID: `fjdwtxtgpqysdfqcqpwu`、テスト用: `qgqcjtjxaoplhxurbpis`）

## 📁 ディレクトリ構成
```
src/
├── components/          # UIコンポーネント
│   ├── auth/           # 認証関連
│   ├── battle/         # バトル関連（BattleCard, ArchivedBattleCard等）
│   ├── home/           # ホーム画面専用
│   ├── layout/         # ヘッダー、フッター、背景
│   └── ui/             # 汎用UI要素
├── hooks/              # カスタムフック
├── i18n/               # 国際化設定
│   └── locales/        # 翻訳ファイル（en.json, ja.json）
├── lib/                # 外部ライブラリ設定（supabase.ts）
├── pages/              # ページコンポーネント
├── store/              # Zustand状態管理
├── types/              # TypeScript型定義
└── utils/              # ユーティリティ関数

supabase/
├── migrations/         # SQL マイグレーションファイル
├── functions/          # Edge Functions (Deno + TypeScript)
└── _shared/           # 共有設定（import_map.json）
```

## 🗂️ データベースマイグレーション
### 基本ルール
- **必須**: 全てのスキーマ変更はマイグレーションファイルで管理
- **命名**: `YYYYMMDDHHMMSS_description.sql`
- **適用**: MCP Supabase toolsを使用（`npx supabase db push`は非推奨）
- **RLS**: 全テーブルでRow Level Security有効化

### 主要テーブル（実際の構造）
```sql
-- ユーザープロフィール
profiles (
  id uuid, username text, email text, avatar_url text, bio text,
  rating integer DEFAULT 1200, language varchar DEFAULT 'English',
  vote_count integer DEFAULT 0,  -- 🆕 投票者ランキング用
  created_at timestamptz, updated_at timestamptz
)

-- 投稿動画
submissions (
  id uuid, user_id uuid, video_url text, battle_format battle_format,
  status submission_status DEFAULT 'WAITING_OPPONENT',
  rank_at_submission integer, active_battle_id uuid,
  created_at timestamptz, updated_at timestamptz
)

-- アクティブバトル
active_battles (
  id uuid, player1_submission_id uuid, player2_submission_id uuid,
  player1_user_id uuid, player2_user_id uuid,
  battle_format battle_format, status battle_status DEFAULT 'ACTIVE',
  votes_a integer DEFAULT 0, votes_b integer DEFAULT 0,
  end_voting_at timestamptz DEFAULT (now() + INTERVAL '5 days'),  -- 🔧 5日間
  created_at timestamptz, updated_at timestamptz
)

-- 投票
battle_votes (
  id uuid, battle_id uuid, user_id uuid, vote char(1),
  created_at timestamptz
)

-- アーカイブバトル（完了済み）
archived_battles (
  id uuid, original_battle_id uuid, winner_id uuid,
  final_votes_a integer, final_votes_b integer,
  player1_user_id uuid, player2_user_id uuid,
  player1_submission_id uuid, player2_submission_id uuid,
  battle_format battle_format,
  player1_rating_change integer, player2_rating_change integer,
  player1_final_rating integer, player2_final_rating integer,
  player1_video_url text, player2_video_url text,  -- 永続保存
  archived_at timestamptz, created_at timestamptz, updated_at timestamptz
)

-- フォーラム投稿
posts (
  id uuid, user_id uuid, content text,
  likes integer DEFAULT 0, liked_by uuid[],
  comments_count integer DEFAULT 0,
  created_at timestamptz, updated_at timestamptz
)

-- コメント
comments (
  id uuid, post_id uuid, user_id uuid, content text,
  created_at timestamptz, updated_at timestamptz
)

-- 通知
notifications (
  id uuid, user_id uuid, title text, message text,
  type varchar CHECK (type IN ('info', 'success', 'warning', 'battle_matched', 'battle_win', 'battle_lose', 'battle_draw')),
  is_read boolean DEFAULT false, related_battle_id uuid,
  created_at timestamptz, updated_at timestamptz
)
```

### ENUMタイプ
```sql
-- バトル形式
battle_format: 'MAIN_BATTLE', 'MINI_BATTLE', 'THEME_CHALLENGE'

-- 投稿ステータス  
submission_status: 'WAITING_OPPONENT', 'MATCHED_IN_BATTLE', 'BATTLE_ENDED', 'WITHDRAWN'

-- バトルステータス
battle_status: 'ACTIVE', 'COMPLETED', 'PROCESSING_RESULTS'
```

## 📜 重要なデータベース関数（実装済み）
### マッチング・バトル管理
1. **`find_match_and_create_battle(p_submission_id)`** ✅ **正常動作中**
   - **即座マッチング**: Edge Function経由で呼び出し
   - **レーティング制限**: 1段階目±50、2段階目±100レート差
   - **優先順位**: レート差最小 → 投稿時刻順
   - **投票期限**: 5日間
   
2. **`progressive_matchmaking()`** ✅ **正常動作中**
   - **段階的マッチング**: pg_cronで5分間隔実行
   - **初期待機**: 2分間（即座マッチングの猶予期間）
   - **段階的レート制限**:
     - 2-20分: ±100レート差
     - 20-40分: ±200レート差
     - 40-60分: ±400レート差
     - 60-80分: ±600レート差
     - 80分以降: 無制限
   
3. **`complete_battle(p_battle_id)`**
   - 投票集計 → 勝者判定 → アーカイブ → レーティング更新
   
4. **`process_expired_battles()`**
   - pg_cronで5分間隔実行（期限切れバトル自動処理）

### レーティングシステム
5. **`calculate_elo_rating_with_format(winner_rating, loser_rating, battle_format)`**
   - 形式別Kファクター: MAIN_BATTLE(32), MINI_BATTLE(24), THEME_CHALLENGE(20)
   
6. **`get_rank_from_rating(rating)`**
   - ランク判定: Grandmaster(1800+), Master(1600+), Expert(1400+), Advanced(1300+), Intermediate(1200+), Beginner(1100+)
   
7. **`update_battle_ratings(p_battle_id, p_winner_id)`**
   - バトル結果に基づくレーティング更新

### 投票・ユーザー管理 & 投票者ランキング
8. **`vote_battle(p_battle_id uuid, p_vote text)`** ✅ **統一・完全版**
   - **完全なバリデーション**: 認証、自己投票防止、期限チェック、重複投票防止
   - **投票者ランキング**: 投票時に`profiles.vote_count`を自動増加
   - **エラーハンドリング**: 詳細な日本語エラーメッセージ
   - **戻り値**: JSON形式（success/error、message含む）
   
9. **`get_user_vote(p_battle_id)`**
   - ユーザーの投票状況確認
   
10. **`update_user_profile_details(p_user_id, p_username, p_bio)`**
    - プロフィール更新

### 🏆 ランキングシステム（2種類実装済み）
11. **`rankings_view`** - プレイヤーランキング（レーティング順）
    - 勝率、勝利数、敗北数を含む総合バトルランキング
    - レーティング、シーズンポイント、勝率でソート可能
    
12. **`voter_rankings_view`** - 🆕 投票者ランキング（投票数順）
    - コミュニティ貢献度を評価する`vote_count`ベースのランキング
    - 投票数でソート、コミュニティ活動を奨励

### 📊 ランキングビューの詳細
```sql
-- プレイヤーランキングビュー
rankings_view: user_id, username, avatar_url, rating, season_points, 
               rank_name, rank_color, battles_won, battles_lost, win_rate, position

-- 投票者ランキングビュー  
voter_rankings_view: user_id, username, avatar_url, vote_count, rating,
                     rank_name, rank_color, created_at, updated_at, position
```

## ⚙️ Edge Functions（実装済み）
### `/submission-webhook` ✅ **マッチング処理の中核**
- **呼び出し元**: フロントエンド PostPage.tsx
- **処理フロー**:
  1. submission_id受信
  2. `find_match_and_create_battle()`実行
  3. 即座マッチング試行（±50→±100レート差）
  4. 成功時: バトル作成、失敗時: WAITING_OPPONENT状態
- **レスポンス**: マッチング成功/待機状態の詳細情報

### `/delete-user-account`  
- **機能**: ユーザーアカウント完全削除
- **処理**: プロフィール削除 → 認証ユーザー削除
- **権限**: 認証済みユーザーのみ

### マッチメイキング戦略（二段階システム）
```javascript
// 1. 即座マッチング（Edge Function）
ユーザー投稿 → submission-webhook → find_match_and_create_battle()
- レート制限: ±50 → ±100
- 結果: 即座バトル作成 or 待機状態

// 2. 段階的マッチング（pg_cron）  
2分後～ → progressive_matchmaking() (5分間隔)
- レート制限: 時間経過で段階的緩和
- 結果: 遅延バトル作成 or 継続待機
```

## ⏰ pg_cron定期処理（実装済み）
```sql
-- 5分間隔で実行される定期ジョブ
1. process_expired_battles    -- バトル終了処理
2. progressive_matchmaking    -- マッチング処理
```

## 🔧 MCP Supabase Tools 活用
### プロジェクト情報
- **開発用プロジェクトID**: `fjdwtxtgpqysdfqcqpwu` (Developブランチ)
- **テスト用プロジェクトID**: `qgqcjtjxaoplhxurbpis` (heartbeat-testブランチ)
- **環境変数**: `.env`ファイルで開発用プロジェクトを指定
- **確認**: `mcp_supabase_get_project(id)`でステータス確認

### 有効な拡張機能
- **pg_cron**: 1.6 (定期処理用)
- **pgcrypto**: 1.3 (暗号化)
- **uuid-ossp**: 1.1 (UUID生成)
- **pg_stat_statements**: 1.10 (クエリ統計)

### データベース操作
```javascript
// マイグレーション適用
mcp_supabase_apply_migration(project_id, name, query)

// SQL実行
mcp_supabase_execute_sql(project_id, query)

// Edge Function デプロイ
mcp_supabase_deploy_edge_function(project_id, name, files)

// テーブル構造確認
mcp_supabase_list_tables(project_id, schemas)

// ログ確認
mcp_supabase_get_logs(project_id, service)
```

## 💻 フロントエンド開発規則
### API通信
- **Supabaseクライアント**: `src/lib/supabase.ts`経由のみ
- **状態管理**: `src/store/`のZustandストアに集約
- **型安全性**: DB変更時は`src/types/`も必ず更新

### 🏪 実装済みストア
- **battleStore.ts**: バトル管理（進行中・アーカイブ・待機中）
- **rankingStore.ts**: プレイヤー・投票者ランキング両方対応
- **authStore.ts**: 認証状態管理
- **notificationStore.ts**: 通知システム
- **toastStore.ts**: UI通知
- **submissionStore.ts**: 投稿管理

### 📄 実装済みページ
- **RankingPage.tsx**: プレイヤー・投票者ランキング（タブ切り替え）
- **BattlesPage.tsx**: アクティブバトル一覧・投票
- **MyBattlesPage.tsx**: 個人バトル履歴
- **CommunityPage.tsx**: フォーラム・投稿
- **ProfilePage.tsx**: プロフィール管理
- **PostPage.tsx**: 動画投稿・マッチング
- **その他**: 設定、通知、ガイド等

### コンポーネント設計
- **命名**: PascalCase（例: `BattleCard.tsx`）
- **ストア**: camelCase（例: `battleStore.ts`）
- **Props型**: `ComponentNameProps`

### 国際化（必須）
- **翻訳関数**: `useTranslation`フック + `t`関数必須
- **新規UI**: `en.json`と`ja.json`両方に翻訳キー追加
- **フォーマット**: 日付・数値も言語設定に応じて表示

## 📝 命名規則
| 要素 | 形式 | 例 |
|---|---|----| 
| テーブル・カラム | snake_case | `active_battles`, `user_id`, `vote_count` |
| SQL関数・ビュー | snake_case | `find_match_and_create_battle`, `voter_rankings_view` |
| TypeScript型 | PascalCase | `Battle`, `VoterRankingEntry` |
| 関数・変数 | camelCase | `fetchBattles`, `voterRankings` |
| Reactコンポーネント | PascalCase.tsx | `BattleCard.tsx` |
| その他ファイル | camelCase.ts | `battleStore.ts` |

## 🚀 開発フロー
### 開発サーバー起動（重要）
- **開発環境**: `npm run dev:develop` （開発用DBに接続 - 推奨）
- **テスト環境**: `npm run dev:test` （テスト用DBに接続）
- **通常**: `npm run dev` （.envファイルの設定を使用）
- **ポート**: 3000番で起動

### 新機能追加時
1. **DB変更**: MCP toolsでマイグレーション適用
2. **型定義**: `src/types/`更新
3. **ストア**: 必要に応じてZustandストア更新
4. **コンポーネント**: UI実装（国際化必須）
5. **翻訳**: `en.json`と`ja.json`更新

### デバッグ時
- **ログ確認**: `mcp_supabase_get_logs(project_id, service)`
- **リアルタイム確認**: Supabaseダッシュボード
- **pg_cron確認**: `cron.job`テーブル
- **関数重複確認**: Supabaseダッシュボード → Database → Functions

### ⚠️ AI開発アシスタント向け注意事項
- **サーバー起動**: 常に `npm run dev:develop` を使用（`npm run dev` ではない）
- **開発フロー**: 開発用DB (`fjdwtxtgpqysdfqcqpwu`) で作業
- **テスト**: 必要時のみテスト用DB (`qgqcjtjxaoplhxurbpis`) を使用
- **🆕 関数作成時**: 既存の同名関数をチェック、必要に応じて統合

## 🎨 UI/UX ガイドライン
- **テーマ**: ダークテーマ中心（gray-900, gray-950ベース）
- **アクセント**: cyan, purple, yellow のグラデーション
- **アニメーション**: Tailwind CSS transitions + custom animations
- **レスポンシブ**: モバイルファースト設計

## ⚠️ 注意事項
### よくある問題
1. **型エラー**: `src/types/`とDB スキーマの不整合
2. **翻訳漏れ**: 新規文言の英語・日本語両方対応忘れ
3. **RLS違反**: ポリシー未設定によるアクセス拒否
4. **pg_cron停止**: 定期処理が動作しない
5. **🆕 重複関数問題**: 同名関数で引数型が異なる場合の競合
   - PostgreSQLは引数型で関数を区別するため、想定外の関数が呼ばれる
   - 解決: 古い関数を削除し、統一された関数を作成

### セキュリティ
- **RLS**: 全テーブル有効（パブリック読み取り、認証済み書き込み）
- **Storage**: videos バケットへの適切なポリシー設定
- **Edge Functions**: CORS設定とエラーハンドリング

## 🧪 テスト
- **テストデータ**: `insert_test_data_remote.sql`使用
- **レーティングテスト**: `test_rating_system.sql`で動作確認
- **マニュアルテスト**: 各画面での実際の操作確認

## 🆕 投票者ランキングシステムの詳細

### 📊 システム概要
- **目的**: コミュニティ参加を促進し、積極的な投票者を評価
- **仕組み**: 各投票でユーザーの`vote_count`が増加
- **表示**: 専用の投票者ランキングタブで確認可能

### 🔧 技術実装
```sql
-- 投票時の自動カウント増加
UPDATE profiles SET vote_count = vote_count + 1 WHERE id = user_id;

-- 投票者ランキングビュー
CREATE VIEW voter_rankings_view AS 
SELECT user_id, username, avatar_url, vote_count, position
FROM profiles WHERE vote_count > 0 
ORDER BY vote_count DESC;
```

### 🎨 UI実装
- **RankingPage.tsx**: プレイヤー・投票者タブ切り替え
- **rankingStore.ts**: 両ランキングの状態管理
- **色分け**: 投票数に応じたカラーコーディング

## 🛠️ データベース関数の重複問題と解決

### 📋 発見された問題
PostgreSQLでは同名関数でも引数型が異なれば別の関数として扱われます。これにより：
- `vote_battle(p_battle_id uuid, p_vote character)` - 短い版、投票者ランキング機能あり
- `vote_battle(p_battle_id uuid, p_vote text)` - 長い版、詳細バリデーションあり

フロントエンドが文字列(`'A'`, `'B'`)を送信するため、TEXT版が呼ばれ、投票者ランキングが機能しない問題が発生。

### ✅ 解決方法
1. **古い関数削除**: `DROP FUNCTION vote_battle(p_battle_id uuid, p_vote character);`
2. **統一関数作成**: 詳細バリデーション + 投票者ランキング機能を含む完全版
3. **機能統合**: 
   - 認証チェック
   - 自己投票防止
   - 投票期限チェック
   - 重複投票防止
   - 投票者ランキング更新

### 🎯 学習ポイント
- PostgreSQL関数は**引数型**で区別される
- 同名関数の競合は予期しない動作を引き起こす
- 関数作成前に既存関数の確認が必須
- 統一された関数設計が重要

---

**🎵 Let's build the ultimate beatboxing platform! 🎵** 