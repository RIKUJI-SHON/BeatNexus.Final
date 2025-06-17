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
- **定期処理**: pg_cron（バトル終了処理5分間隔、マッチメイキング30分間隔・理想的な時間ベース緩やかなレート制限緩和）
- **国際化**: react-i18next
- **デプロイ**: Supabase（プロジェクトID: `qgqcjtjxaoplhxurbpis`）

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
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  rating integer DEFAULT 1200,
  language varchar CHECK (language IN ('en', 'ja')),
  vote_count integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz
)

-- 投稿動画
submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  video_url text NOT NULL,
  status submission_status DEFAULT 'WAITING_OPPONENT',
  rank_at_submission integer,
  active_battle_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  battle_format battle_format
)

-- アクティブバトル
active_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_submission_id uuid NOT NULL,
  player2_submission_id uuid NOT NULL,
  player1_user_id uuid NOT NULL REFERENCES profiles(id),
  player2_user_id uuid NOT NULL REFERENCES profiles(id),
  battle_format battle_format NOT NULL,
  status battle_status DEFAULT 'ACTIVE',
  votes_a integer DEFAULT 0,
  votes_b integer DEFAULT 0,
  end_voting_at timestamptz DEFAULT (now() + INTERVAL '5 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- 投票
battle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES active_battles(id),
  user_id uuid REFERENCES profiles(id),
  vote char(1) CHECK (vote IN ('A', 'B')),
  comment text,
  created_at timestamptz DEFAULT now()
)

-- アーカイブバトル（完了済み）
archived_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_battle_id uuid NOT NULL,
  winner_id uuid REFERENCES profiles(id),
  final_votes_a integer DEFAULT 0,
  final_votes_b integer DEFAULT 0,
  archived_at timestamptz DEFAULT now(),
  player1_user_id uuid NOT NULL REFERENCES profiles(id),
  player2_user_id uuid NOT NULL REFERENCES profiles(id),
  player1_submission_id uuid NOT NULL,
  player2_submission_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  battle_format battle_format NOT NULL,
  player1_rating_change integer DEFAULT 0,
  player2_rating_change integer DEFAULT 0,
  player1_final_rating integer,
  player2_final_rating integer,
  player1_video_url text,
  player2_video_url text
)

-- フォーラム投稿
posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  likes integer DEFAULT 0,
  liked_by uuid[] DEFAULT ARRAY[]::uuid[],
  comments_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- コメント
comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- 通知
notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  message text NOT NULL,
  type varchar CHECK (type IN ('info', 'success', 'warning', 'battle_matched', 'battle_win', 'battle_lose', 'battle_draw')),
  is_read boolean DEFAULT false,
  related_battle_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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
   - **段階的マッチング**: pg_cronで30分間隔実行
   - **初期待機**: 10分間（即座マッチングの猶予期間）
   - **段階的レート制限**（理想的な時間ベースシステム）:
     - 0-6時間: ±50レート差（新鮮な対戦はほぼ同格同士）
     - 6-24時間: ±100レート差（少し幅を持たせてマッチ確率UP）
     - 24-72時間: ±200レート差（24時間以内にマッチできなかったら緩和）
     - 72-168時間: ±300レート差（3日-7日経過でさらに緩和）
     - 168時間以降: 無制限（どうしても当たらない場合は全体からマッチ）
   
3. **`complete_battle(p_battle_id)`**
   - 投票集計 → 勝者判定 → アーカイブ → レーティング更新
   
4. **`process_expired_battles()`**
   - pg_cronで5分間隔実行（期限切れバトル自動処理）

### レーティングシステム
5. **`calculate_elo_rating_with_format(winner_rating, loser_rating, battle_format)`**
   - 形式別Kファクター: MAIN_BATTLE(32), MINI_BATTLE(24), THEME_CHALLENGE(20)
   
6. **`get_rank_from_rating(rating)`**
   - ランク判定: Grandmaster(1800+), Master(1600+), Expert(1400+), Advanced(1300+), Intermediate(1200+), Beginner(1100+)
   
7. **`get_rank_color_from_rating(rating)`**
   - ランク色取得: ランクに応じた色コード返却
   
8. **`update_battle_ratings(p_battle_id, p_winner_id)`**
   - バトル結果に基づくレーティング更新

### 投票・ユーザー管理
9. **`vote_battle(p_battle_id, p_vote)`**
   - 投票機能（'A' または 'B'）
   
10. **`get_user_vote(p_battle_id)`**
    - ユーザーの投票状況確認
    
11. **`cancel_vote(p_battle_id)`**
    - 投票取り消し機能
   
12. **`update_user_profile_details(p_user_id, p_username, p_bio)`**
    - プロフィール更新

13. **`update_user_avatar(p_user_id, p_avatar_url)`**
    - アバター更新

### 投稿制限・セキュリティ ✅ **新機能**
26. **`check_submission_cooldown(p_user_id)`**
    - **24時間投稿制限チェック**: ユーザーの最後の投稿から24時間経過したかを確認
    - **レスポンス**: 投稿可能性、残り時間、前回投稿時刻を含むJSON
    - **リアルタイム更新**: フロントエンドで1分間隔で残り時間を更新
    
27. **`create_submission_with_cooldown_check(p_user_id, p_video_url, p_battle_format)`**
    - **安全な投稿作成**: 24時間制限チェック後に投稿を作成
    - **制限時エラー**: 24時間以内の場合は適切なエラーメッセージを返す
    - **自動統合**: フロントエンドの投稿フローと完全統合

### 投稿管理
14. **`withdraw_submission(p_submission_id)`**
    - 投稿取り消し機能

15. **`get_waiting_submissions()`**
    - 待機中投稿一覧取得

### ランキング・ユーザー情報
16. **`get_top_rankings(p_limit)`**
    - トップランキング取得

17. **`get_top_voter_rankings(p_limit)`**
    - 投票者ランキング取得

18. **`get_user_rank(p_user_id)`**
    - ユーザーランク情報取得

19. **`get_user_voter_rank(p_user_id)`**
    - ユーザー投票ランク取得

20. **`get_user_profile(p_user_id)`**
    - ユーザープロフィール詳細取得

### ユーザー削除・セキュリティ ✅ **v3完全メール解放システム**
21. **`safe_delete_user_account(p_user_id)`** → **`safe_delete_user_account_v3(p_user_id)`**
    - **完全メール解放**: 削除後すぐに同じメールアドレスで再登録可能
    - **動画完全削除**: `delete_user_videos_from_storage()`でストレージから物理削除
    - **二段階削除**:
      - **バトル履歴あり**: ソフト削除（完全匿名化 + メール解放）
      - **バトル履歴なし**: 物理削除（完全削除）
    - **メール匿名化**: `permanently-deleted-{timestamp}-{user_id}@void.deleted`
    - **メタデータ**: 元のメール情報を完全削除、再利用可能フラグ設定

22. **`delete_user_videos_from_storage(p_user_id)`**
    - **動画ファイル削除**: submissions, archived_battlesから全動画URL収集
    - **ストレージ削除**: storage.objectsテーブルから物理削除
    - **結果レポート**: 削除成功/失敗数、URL一覧を含むJSON返却

23. **`admin_force_release_email(p_email)`** ✅ **管理者機能**
    - **強制メール解放**: 特定のメールアドレスを管理者が強制的に解放
    - **完全匿名化**: `force-released-{timestamp}-{user_id}@admin.released`
    - **即座利用可能**: 解放後すぐに新規登録可能

### アカウント削除システムの特徴
```sql
-- v3システムの動作フロー
1. 動画ファイル削除（ストレージから物理削除）
2. バトル履歴確認
   - 履歴あり: ソフト削除（プロフィール匿名化 + auth完全匿名化）
   - 履歴なし: 物理削除（全データ削除 + auth削除）
3. メールアドレス即座解放（元情報完全削除）
4. 同じメールアドレスで即座再登録可能
```

### 削除後の状態
- **プロフィール**: `deleted-user-{user_id}`として匿名化
- **メールアドレス**: 完全に解放、再利用可能
- **動画ファイル**: ストレージから物理削除
- **バトル履歴**: 匿名ユーザーとして閲覧可能
- **認証情報**: 完全匿名化または削除

### ヘルパー関数
23. **`get_k_factor_by_format(battle_format)`**
    - バトル形式別Kファクター取得

24. **`calculate_elo_rating(winner_rating, loser_rating, k_factor)`**
    - Eloレーティング計算（基本版）

25. **`calculate_elo_rating_change(player_rating, opponent_rating, result, k_factor)`**
    - レーティング変化量計算

## ⚙️ Edge Functions（実装済み）
### `/submission-webhook` ✅ **マッチング処理の中核**
- **呼び出し元**: フロントエンド PostPage.tsx
- **処理フロー**:
  1. submission_id受信
  2. `find_match_and_create_battle()`実行
  3. 即座マッチング試行（±50→±100レート差）
  4. 成功時: バトル作成、失敗時: WAITING_OPPONENT状態
- **レスポンス**: マッチング成功/待機状態の詳細情報

### `/delete-user-account` ✅ **v3完全削除システム**
- **機能**: ユーザーアカウント完全削除（メール即座解放）
- **処理**: 
  1. `safe_delete_user_account_v3()`実行
  2. 動画ファイル物理削除
  3. バトル履歴に応じてソフト削除/物理削除
  4. メールアドレス完全解放
- **権限**: 認証済みユーザーのみ
- **レスポンス**: 削除方式、メール解放状況、動画削除結果

### マッチメイキング戦略（二段階システム）
```javascript
// 1. 即座マッチング（Edge Function）
ユーザー投稿 → submission-webhook → find_match_and_create_battle()
- レート制限: ±50 → ±100
- 結果: 即座バトル作成 or 待機状態

// 2. 段階的マッチング（pg_cron）  
30分後～ → progressive_matchmaking() (30分間隔)
- 緩やかなレート制限緩和（5日間投票期間に適応）:
  * 0-6時間: ±50（同格重視）
  * 6-24時間: ±100（少し幅拡大）
  * 24-72時間: ±200（24時間後緩和）
  * 72-168時間: ±300（3日-7日緩和）
  * 168時間以降: 無制限（7日後全体マッチ）
- 結果: 遅延バトル作成 or 継続待機
```

## ⏰ pg_cron定期処理（実装済み）
```sql
-- 定期実行ジョブ
1. process_expired_battles    -- 5分間隔でバトル終了処理
2. progressive-matchmaking-30min    -- 30分間隔でマッチング処理
```

## 🔧 データベースビュー（実装済み）
### ランキングビュー
- **`rankings_view`** - レーティングベースランキング（削除ユーザー除外）
- **`voter_rankings_view`** - 投票数ベースランキング（削除ユーザー除外）

### プライバシー保護ビュー
- **`public_active_battles`** - アクティブバトル（削除ユーザー匿名化）
- **`public_archived_battles`** - アーカイブバトル（削除ユーザー匿名化）

## 🔧 MCP Supabase Tools 活用
### プロジェクト情報
- **プロジェクトID**: `qgqcjtjxaoplhxurbpis`
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

### 投稿制限システム ✅ **新機能**
- **24時間制限**: `useSubmissionCooldown`フックでリアルタイム制限チェック
- **UI統合**: PostPageで制限状況の表示、ボタン無効化、エラーメッセージ
- **自動更新**: 1分間隔で残り時間を更新、投稿成功後に状態リフレッシュ

### 国際化（必須）
- **翻訳関数**: `useTranslation`フック + `t`関数必須
- **新規UI**: `en.json`と`ja.json`両方に翻訳キー追加
- **フォーマット**: 日付・数値も言語設定に応じて表示

## 📝 命名規則
| 要素 | 形式 | 例 |
|---|---|----| 
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
- **アカウント削除**: v3完全メール解放システム
  - 動画ファイル物理削除
  - メールアドレス即座解放
  - プライバシー保護と参照整合性の両立
  - 管理者による強制メール解放機能

## 🧪 テスト
- **テストデータ**: `insert_test_data_remote.sql`使用
- **レーティングテスト**: `test_rating_system.sql`で動作確認
- **マニュアルテスト**: 各画面での実際の操作確認

---

**🎵 Let's build the ultimate beatboxing platform! 🎵**

### ⚡ 重要な仕様（データベース実装に基づく）

#### **バトル投票期限**
- **期限**: 5日間（`end_voting_at DEFAULT now() + INTERVAL '5 days'`）
- **自動処理**: pg_cronで5分間隔で期限切れバトルを処理

#### **マッチメイキング**
- **即座マッチング**: ±50→±100レート差で即座実行
- **段階的マッチング**: 30分間隔で段階的レート制限緩和

#### **ユーザー削除**
- **方式**: ソフト削除（匿名化）
- **メール再利用**: 可能（auth.usersも匿名化）
- **プライバシー**: 完全匿名化表示

#### **ランキング**
- **レーティング**: `rankings_view`
- **投票者**: `voter_rankings_view`
- **除外**: 削除ユーザーは非表示

このRulesに従って、BeatNexusプロジェクトの開発・運用を進めましょう！ 