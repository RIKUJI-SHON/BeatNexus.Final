# 🎵 BeatNexus Cursor Rules

## 🎯 プロジェクト概要
**BeatNexus**は、ビートボクシング愛好者向けの競技プラットフォームです。
- **投稿型バトル**: 動画投稿 → 自動マッチング → コミュニティ投票 → 勝者決定
- **レーティングシステム**: 戦績ベースの個人レーティングとシーズンランキング
- **コミュニティ**: リアルタイム通知、コメント、フォーラム機能
- **多言語対応**: 日本語・英語完全対応

## 🛠️ 技術スタック
- **フロントエンド**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **バックエンド**: Supabase (PostgreSQL + Edge Functions + Storage + Auth)
- **定期処理**: pg_cron（5分間隔でバトル終了処理）
- **国際化**: react-i18next
- **デプロイ**: Supabase（プロジェクトID: `tkzyejyyegzjapmtyjpz`）

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
  end_voting_at timestamptz DEFAULT (now() + INTERVAL '5 days'),
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
   - **段階的マッチング**: pg_cronで30分間隔実行（毎時0分・30分）
   - **初期待機**: 10分間（即座マッチングの猶予期間）
   - **段階的レート制限**（より緩やか）:
     - 10-60分: ±80レート差
     - 60-120分: ±120レート差
     - 120-180分: ±160レート差
     - 180-240分: ±200レート差
     - 240-360分: ±300レート差
     - 360-480分: ±400レート差
     - 480-720分: ±500レート差
     - 720分以降: 無制限
   - **投票期限**: 5日間
   
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

### 投票・ユーザー管理
8. **`vote_battle(p_battle_id, p_vote)`**
   - 投票機能（'A' または 'B'）
   
9. **`get_user_vote(p_battle_id)`**
   - ユーザーの投票状況確認
   
10. **`update_user_profile_details(p_user_id, p_username, p_bio)`**
    - プロフィール更新

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

### 🔧 **実際のマッチメイキングアーキテクチャ**

```
【即座マッチング】Edge Function経由
投稿 → submission-webhook → find_match_and_create_battle()
├─ ±50レート差で検索
├─ 見つからない場合 ±100レート差で検索  
└─ それでもダメなら WAITING_OPPONENT状態

【段階的マッチング】pg_cron経由（10分後から開始）
10分待機 → progressive_matchmaking() (30分間隔)
├─ 10-60分: ±80レート差
├─ 60-120分: ±120レート差
├─ 120-180分: ±160レート差
├─ 180-240分: ±200レート差
├─ 240-360分: ±300レート差
├─ 360-480分: ±400レート差
├─ 480-720分: ±500レート差
└─ 720分以降: 無制限
```

## ⏰ pg_cron定期処理（実装済み）
```sql
-- 定期ジョブ
1. process_expired_battles    -- バトル終了処理（5分間隔）
2. progressive_matchmaking    -- マッチング処理（30分間隔）
```

## 🔧 MCP Supabase Tools 活用
### プロジェクト情報
- **プロジェクトID**: `tkzyejyyegzjapmtyjpz`
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
|------|------|----| 
| テーブル・カラム | snake_case | `active_battles`, `user_id` |
| SQL関数 | snake_case | `find_match_and_create_battle` |
| TypeScript型 | PascalCase | `Battle`, `UserProfile` |
| 関数・変数 | camelCase | `fetchBattles`, `userProfile` |
| Reactコンポーネント | PascalCase.tsx | `BattleCard.tsx` |
| その他ファイル | camelCase.ts | `battleStore.ts` |

## 🚀 開発フロー
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

### セキュリティ
- **RLS**: 全テーブル有効（パブリック読み取り、認証済み書き込み）
- **Storage**: videos バケットへの適切なポリシー設定
- **Edge Functions**: CORS設定とエラーハンドリング

## 🧪 テスト
- **テストデータ**: `insert_test_data_remote.sql`使用
- **レーティングテスト**: `test_rating_system.sql`で動作確認
- **マニュアルテスト**: 各画面での実際の操作確認

### 📊 **システムの賢さ**

- **二段階マッチング**: 即座（Edge Function）+ 段階的（30分間隔pg_cron）
- **レート考慮**: 時間経過で段階的に条件緩和（より慎重なアプローチ）
- **効率性**: 30分間隔でサーバー負荷を軽減
- **適応性**: 12時間かけてゆっくりと適切な相手を発見
- **投票期間**: 5日間でじっくり投票可能

---

**🎵 Let's build the ultimate beatboxing platform! 🎵** 