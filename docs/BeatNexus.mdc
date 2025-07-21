---
description: 
globs: 
alwaysApply: true
---
# 🎵 BeatNexus Cursor Rules

## 🎯 プロジェクト概要
**BeatNexus**は、ビートボクサーのための競技プラットフォームです。
- **投稿型バトル**: 動画投稿 → 自動マッチング → コミュニティ投票 → 勝者決定
- **レーティングシステム**: 戦績ベースの個人レーティングとシーズンランキング
- **投票者ランキング**: コミュニティ貢献度を評価する投票数ベースのランキング
- **コミュニティシステム**: コミュニティ作成・参加、リアルタイムチャット、メンバー管理機能
- **フォーラム機能**: リアルタイム通知、コメント、投稿機能
- **多言語対応**: 日本語・英語完全対応

## 🛠️ 技術スタック
- **フロントエンド**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **バックエンド**: Supabase (PostgreSQL + Edge Functions + Storage + Auth)
- **定期処理**: pg_cron（バトル終了処理5分間隔、マッチメイキング30分間隔・理想的な時間ベース緩やかなレート制限緩和）
- **国際化**: react-i18next
- **デプロイ**: Supabase（プロジェクトID: 本番用`qgqcjtjxaoplhxurbpis`, 開発環境用 `wdttluticnlqzmqmfvgt`）

## 🧪 開発プロセス重要ルール
**⚠️ 必須**: 新機能実装は必ずテストDB環境(`wdttluticnlqzmqmfvgt`)で開始してください！
詳細ルールは `2025-06-28_test_database_development_rules.mdc` を参照

## 📁 ディレクトリ構成
```
src/
├── components/          # UIコンポーネント
│   ├── auth/           # 認証関連
│   ├── battle/         # バトル関連（BattleCard, ArchivedBattleCard等）
│   ├── community/      # コミュニティ関連（未実装）
│   ├── home/           # ホーム画面専用
│   ├── layout/         # ヘッダー、フッター、背景
│   ├── onboarding/     # オンボーディング関連（モーダル、スライド）
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

## 🎨 バトルカードシステム
### 2種類のバトルカード
1. **SimpleBattleCard** ✅ **デフォルト**
   - **デザイン**: シンプルな暗い背景（`#181818`）、控えめな白い枠線
   - **適用条件**: 投票数が5未満のバトル
   - **特徴**: ミニマルデザイン、軽いホバーエフェクト

2. **SpecialBattleCard** ✅ **人気バトル用**
   - **デザイン**: カラフルなグラデーション枠（ピンク→青）、グローエフェクト
   - **適用条件**: 投票数が5以上のバトル
   - **特徴**: 派手なアニメーション、目立つビジュアルエフェクト

### 自動選択システム
- **BattleCard**: 投票数に基づいて自動的にSimpleBattleCardまたはSpecialBattleCardを選択
- **閾値**: 総投票数5以上でSpecialBattleCardに昇格
- **統一インターフェース**: 全ページで`<BattleCard>`を使用、内部で自動判定

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
  deleted_at timestamptz,
  has_seen_onboarding boolean DEFAULT false,
  current_community_id uuid REFERENCES communities(id) ON DELETE SET NULL,  -- ✅ 1コミュニティ制限システム
  season_points integer DEFAULT 1200, -- ✅ シーズン専用ポイント
  season_vote_points integer DEFAULT 0 -- ✅ シーズン専用投票ポイント
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
  battle_format battle_format,
  season_id uuid -- ✅ シーズンID
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
  updated_at timestamptz DEFAULT now(),
  season_id uuid -- ✅ シーズンID
)

-- 投票
battle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES active_battles(id),
  user_id uuid REFERENCES profiles(id),
  vote char(1) CHECK (vote IN ('A', 'B')),
  comment text,
  created_at timestamptz DEFAULT now(),
  season_id uuid -- ✅ シーズンID
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
  player2_video_url text,
  season_id uuid -- ✅ シーズンID
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

-- ✅ コミュニティシステム（実装完了）
-- コミュニティ
communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_user_id uuid NOT NULL REFERENCES profiles(id),
  member_count integer DEFAULT 1,
  average_rating integer DEFAULT 1200,
  password_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- コミュニティメンバー（✅ 1ユーザー1コミュニティ制限）
community_members (
  community_id uuid NOT NULL REFERENCES communities(id),
  user_id uuid NOT NULL REFERENCES profiles(id) UNIQUE,  -- ✅ ユニーク制約追加
  role community_role DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (community_id, user_id),
  CONSTRAINT unique_user_community UNIQUE (user_id)  -- ✅ 1ユーザー1コミュニティ制限
)

-- コミュニティチャット
community_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- ✅ シーズンシステム (一部実装済み)
-- シーズン
seasons (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text CHECK (status IN ('upcoming', 'active', 'ended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- シーズンランキング (スナップショット)
season_rankings (
  season_id uuid NOT NULL REFERENCES seasons(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  rank integer NOT NULL,
  points integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (season_id, user_id)
)

-- シーズン投票者ランキング (スナップショット)
season_voter_rankings (
  season_id uuid NOT NULL REFERENCES seasons(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  rank integer NOT NULL,
  votes integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (season_id, user_id)
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

-- コミュニティ役割
community_role: 'owner', 'admin', 'member'
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
   
3. **`complete_battle_with_video_archiving(p_battle_id)`** ✅ **実際の主要関数**
   - **統合処理**: 投票集計 → 勝者判定 → アーカイブ → レーティング更新 → シーズンポイント更新
   - **動画保存**: プレイヤー動画URLをアーカイブテーブルに保存
   - **削除ユーザー対応**: `update_battle_ratings_safe()`を内部で呼び出し
   - **シーズン連携**: `update_season_points_after_battle()`を自動実行
   
4. **`process_expired_battles()`**
   - **pg_cron実行**: 5分間隔で期限切れバトル自動処理
   - **実際の処理**: `complete_battle_with_video_archiving()`を呼び出し

### レーティングシステム
5. **`calculate_elo_rating_with_format(winner_rating, loser_rating, battle_format)`**
   - 形式別Kファクター: MAIN_BATTLE(32), MINI_BATTLE(24), THEME_CHALLENGE(20)
   
6. **`get_rank_from_rating(rating)`**
   - ランク判定: Grandmaster(1800+), Master(1600+), Expert(1400+), Advanced(1300+), Intermediate(1200+), Beginner(1100+)
   
7. **`get_rank_color_from_rating(rating)`**
   - ランク色取得: ランクに応じた色コード返却
   
8. **`update_battle_ratings_safe(p_battle_id, p_winner_id)`** ✅ **実際の主要関数**
   - **削除ユーザー対応**: `is_deleted`フラグをチェックし、削除済みユーザーはレーティング更新をスキップ
   - **Eloレーティング計算**: `calculate_elo_rating_with_format()`を使用してバトル形式別のレーティング更新
   - **プロフィール更新**: `updated_at`タイムスタンプも同時更新
   - **戻り値**: レーティング変動量を含むJSON形式で結果を返却

### 投票・ユーザー管理
9. **`vote_battle(p_battle_id, p_vote)`**
   - **機能**: 投票機能（'A' または 'B'）。通算投票数(`vote_count`)とシーズン投票ポイント(`season_vote_points`)を同時に加算する。
   
10. **`get_user_vote(p_battle_id)`**
    - ユーザーの投票状況確認
    
11. **`cancel_vote(p_battle_id)`**
    - 投票取り消し機能
   
12. **`update_user_profile_details(p_user_id, p_username, p_bio)`**
    - プロフィール更新

13. **`update_user_avatar(p_user_id, p_avatar_url)`**
    - アバター更新

14. **`update_onboarding_status(p_user_id, p_has_seen)`** ✅ **オンボーディング管理**
    - **機能**: ユーザーのオンボーディング完了ステータス更新
    - **パラメータ**: ユーザーID、完了フラグ（boolean）
    - **セキュリティ**: RLS適用済み（本人のみ更新可能）
    - **用途**: ガイドモーダル表示制御

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

### ヘルパー関数 ✅ **2025-07-14修正完了**
23. **`get_k_factor_by_format(battle_format text)`** ✅ **TEXT版**
    - **形式別Kファクター**: MAIN_BATTLE(32), MINI_BATTLE(24), THEME_CHALLENGE(20)
    - **デフォルト値**: 不明な形式の場合は32を返却
    
24. **`get_k_factor_by_format(battle_format battle_format)`** ✅ **ENUM版**
    - **ENUM引数対応**: PostgreSQL ENUM型での呼び出しに対応
    - **同じ処理**: TEXT版と同様のKファクター計算
    
25. **`calculate_elo_rating(winner_rating, loser_rating, k_factor)`**
    - Eloレーティング計算（基本版）

26. **`calculate_elo_rating_change(player_rating, opponent_rating, result, k_factor)`** ✅ **追加実装**
    - **詳細レーティング変化計算**: 勝敗結果（0.0 = 敗北, 0.5 = 引き分け, 1.0 = 勝利）
    - **期待値計算**: Elo標準公式に基づく期待値算出
    - **変動量算出**: K-factor × (実際の結果 - 期待値)

### ✅ シーズン関連関数 **2025-07-14修正完了**
27. **`update_season_points_after_battle(p_battle_id, p_winner_id)`** ✅ **実装済み**
    - **Eloレーティング連動**: 通常のレーティングと同じ計算式でシーズンポイントを更新
    - **自動実行**: `complete_battle_with_video_archiving()`から自動で呼び出される
    - **削除ユーザー対応**: プレイヤーの削除状態をチェック
    - **戻り値**: 更新成功の確認情報をJSON形式で返却

28. **`end_current_season()`**
    - シーズンを終了し、ランキングのスナップショットを作成、ポイントをリセットする。

29. **`get_active_season()`**
    - 現在アクティブなシーズン情報を取得する。

## 🏘️ コミュニティシステム関数（実装済み） ✅

### コミュニティ基本操作
28. **`create_community(p_name, p_description, p_password)`** ✅ **コミュニティ作成**
    - **機能**: 新規コミュニティ作成（パスワード保護対応）
    - **パラメータ**: 名前（必須）、説明（任意）、パスワード（任意）
    - **戻り値**: 成功フラグ、メッセージ、コミュニティID
    - **セキュリティ**: 認証済みユーザーのみ、オーナー権限自動付与

29. **`join_community(p_community_id, p_password)`** ✅ **コミュニティ参加**
    - **機能**: 既存コミュニティへの参加
    - **パスワード認証**: プライベートコミュニティ対応
    - **自動統計更新**: メンバー数、平均レーティング自動更新
    - **重複チェック**: 既存メンバーのエラーハンドリング

30. **`leave_community(p_community_id)`** ✅ **コミュニティ退出**
    - **機能**: コミュニティからの退出
    - **制限**: オーナーは退出不可（譲渡または削除が必要）
    - **自動統計更新**: メンバー数、平均レーティング自動更新
    - **データ整合性**: 退出後のデータクリーンアップ

### コミュニティ管理機能
31. **`kick_member_from_community(p_community_id, p_target_user_id)`** ✅ **メンバーキック**
    - **権限**: オーナー（全メンバー）、管理者（一般メンバーのみ）
    - **制限**: 自分自身はキック不可
    - **自動統計更新**: メンバー数、平均レーティング更新
    - **セキュリティ**: 権限チェック、RLS適用

32. **`update_member_role(p_community_id, p_target_user_id, p_new_role)`** ✅ **役割変更**
    - **権限**: オーナーのみ実行可能
    - **役割**: 'admin' ↔ 'member' の昇格・降格
    - **制限**: オーナー役割の変更は不可
    - **ログ**: 役割変更の履歴追跡

### 1コミュニティ制限システム ✅ **v2更新**
33. **`get_user_current_community(p_user_id)`** ✅ **現在のコミュニティ取得**
    - **機能**: ユーザーが現在所属しているコミュニティ情報を取得
    - **レスポンス**: コミュニティ詳細（ID、名前、説明、役割等）
    - **用途**: 自動リダイレクト判定、現在の所属状況確認

34. **`join_community(p_community_id, p_password)` (更新版)** ✅ **自動退出機能**
    - **新機能**: 既存コミュニティから自動退出→新コミュニティに参加
    - **制限**: 1ユーザー1コミュニティのみ
    - **統計更新**: 両方のコミュニティの統計を自動更新
    - **seamless移行**: ユーザーは意識せずにコミュニティを切り替え

35. **`sync_user_community()`** ✅ **同期トリガー関数**
    - **機能**: community_membersテーブルの変更をprofiles.current_community_idに同期
    - **トリガー**: INSERT/DELETE時に自動実行
    - **一貫性**: データベースレベルでの整合性保証

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

### コミュニティビュー ✅ **実装済み**
- **`global_community_rankings_view`** - 全コミュニティランキング（平均レート・メンバー数順）
- **`community_rankings_view`** - コミュニティ内メンバーランキング（レート順）
- **`user_communities_view`** - ユーザー参加コミュニティ一覧（参加日順）

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
- **オンボーディング**: `src/components/onboarding/slides/`に各スライド格納

### 投稿制限システム ✅ **新機能**
- **24時間制限**: `useSubmissionCooldown`フックでリアルタイム制限チェック
- **UI統合**: PostPageで制限状況の表示、ボタン無効化、エラーメッセージ
- **自動更新**: 1分間隔で残り時間を更新、投稿成功後に状態リフレッシュ

### オンボーディングシステム ✅ **新機能**
- **新規ユーザー限定**: `has_seen_onboarding`フラグで初回のみガイド表示
- **状態管理**: `onboardingStore.ts`でSupabase連携
- **自動トリガー**: `AuthProvider.tsx`で新規登録時（SIGNED_UP）のみ実行
- **プロフィール設定**: アバター・バイオの2段階ガイド統合
- **レスポンシブ**: PC/モバイル対応のモーダルサイズ調整

### コミュニティシステム ✅ **完全実装（v2: 1コミュニティ制限）**
- **CommunityPage**: コミュニティ一覧・作成・検索機能
  - **デザイン統一**: BattlesPageと同じダークテーマ・グラデーション
  - **ヒーローセクション**: BeatNexusロゴ・背景画像
  - **作成モーダル**: フル機能フォーム（名前・説明・プライベート設定）
  - **検索機能**: コミュニティ名・説明・オーナー名でリアルタイム検索
  - **✅ 自動リダイレクト**: 既存所属ユーザーは詳細ページに自動転送

- **CommunityDetailPage**: コミュニティ詳細・管理機能
  - **3タブシステム**: メンバーランキング・チャット・管理
  - **✅ リアルタイムチャット**: Supabase Realtime連携（RLS無効化で正常動作）
  - **メンバー管理**: 役割表示・キック・昇格/降格機能
  - **権限制御**: オーナー・管理者・メンバーの役割ベースアクセス

- **CommunityStore**: Zustand状態管理
  - **完全CRUD**: 作成・参加・退出・管理操作
  - **✅ 1コミュニティ制限**: `fetchUserCurrentCommunity()`で現在の所属確認
  - **リアルタイム同期**: チャットメッセージの自動受信
  - **エラーハンドリング**: 適切なトーストメッセージ
  - **データ整合性**: 操作後の自動データ再取得

### ✅ **1コミュニティ制限システムの特徴**
- **データベース制約**: `unique_user_community`制約でデータレベルでの制限
- **自動退出**: 新しいコミュニティ参加時に既存から自動退出
- **シームレス移行**: ユーザーは意識せずにコミュニティを切り替え
- **リダイレクト**: 既存所属ユーザーは一覧ページから詳細ページに自動転送
- **データ同期**: トリガー関数による`profiles.current_community_id`の自動同期

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

## 🏘️ コミュニティ機能の完全実装状況 ✅

### ✅ **フロントエンド実装完了**
- **CommunityPage** (`/community`): コミュニティ一覧・作成
- **CommunityDetailPage** (`/community/:id`): 詳細・チャット・管理
- **CommunityStore**: Zustand状態管理（`src/store/communityStore.ts`）
- **ルーティング**: App.tsxに完全統合済み

### ✅ **バックエンド実装完了**
- **テーブル**: `communities`, `community_members`, `community_chat_messages`
- **関数**: 作成・参加・退出・キック・役割変更の5つの主要関数
- **ビュー**: グローバル・コミュニティ内・ユーザー参加の3つのランキングビュー
- **リアルタイム**: チャットメッセージの即座同期

### ✅ **セキュリティ・権限制御**
- **RLS**: 全テーブルでRow Level Security有効
- **役割ベース**: オーナー・管理者・メンバーの3段階権限
- **パスワード保護**: プライベートコミュニティ対応
- **認証統合**: RequireAuthフックでアクセス制御

### ✅ **UI/UXデザイン統一**
- **BattlesPageスタイル**: 完全に統一されたダークテーマ
- **レスポンシブ**: モバイル・PC対応
- **アニメーション**: ホバーエフェクト・トランジション
- **国際化**: 日英40+翻訳キー完全対応

### 🎯 **主要ページ・機能**
| ページ | URL | 実装状況 | 主要機能 |
|-------|-----|---------|----------|
| コミュニティ一覧 | `/community` | ✅ 完了 | 一覧・作成・検索・参加 |
| コミュニティ詳細 | `/community/:id` | ✅ 完了 | ランキング・チャット・管理 |
| バトル一覧 | `/battles` | ✅ 完了 | バトル表示・フィルター |
| バトル詳細 | `/battle/:id` | ✅ 完了 | 投票・コメント |
| 投稿画面 | `/post` | ✅ 完了 | 動画投稿・マッチング |
| ランキング | `/ranking` | ✅ 完了 | ユーザー・投票者ランキング |

---

**🎵 Let's build the ultimate beatbox platform! 🎵**

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

#### **コミュニティシステム（v2更新）** ✅
- **1コミュニティ制限**: ユーザーは1つのコミュニティにのみ所属可能
- **自動退出**: 新しいコミュニティ参加時に既存から自動退出
- **リダイレクト**: 既存所属ユーザーは一覧ページから詳細ページに自動転送
- **チャット機能**: RLS無効化により正常動作（セキュリティ見直し要）

#### **ランキング**
- **レーティング**: `rankings_view`
- **投票者**: `voter_rankings_view`
- **除外**: 削除ユーザーは非表示

#### **最新マイグレーション** ✅
- **20250714180000_add_missing_rating_helper_functions.sql**: レーティング補助関数追加 🆕
  - `get_k_factor_by_format()`のTEXT版・ENUM版を追加
  - `calculate_elo_rating_change()`関数を追加
  - 本番環境でのレーティング計算エラーを解決
- **20250714180000_sync_dev_rating_functions_to_prod.sql**: 関数定義同期 🆕
  - `update_battle_ratings_safe()`: 削除ユーザー対応版に更新
  - `update_season_points_after_battle()`: シーズンポイント更新関数同期
  - `complete_battle_with_video_archiving()`: 動画保存統合版に更新
  - `process_expired_battles()`: 最新のバトル終了処理に同期
- **20250131120000_single_community_per_user.sql**: 1コミュニティ制限システム実装
  - `profiles.current_community_id`カラム追加
  - `community_members.user_id`にユニーク制約
  - `sync_user_community()`トリガー関数
- **20250704120000_set_season_points_default_to_1200.sql**: シーズンポイント初期値設定
  - `profiles.season_points`のデフォルト値を`1200`に設定
  - 既存ユーザーの`season_points`が0の場合`1200`に更新

## 🎯 次期大型機能：シーズンポイント制度 🆕
**実装予定期間**: 未定（サークル内でのテスト終了後）  
**ステータス**: 📋 **一部実装済み**

### 概要
3ヶ月ごとのシーズン制を導入し、初心者でも定期的に上位を狙える競争環境を構築。  
マッチング用レート（`rating`）とランキング用ポイント（`season_points`）を分離し、  
マッチング品質を保ちながら競争のリフレッシュを実現する。

### ✅ 実装済みの機能
- **DBスキーマ拡張**: `profiles`に`season_points`, `season_vote_points`を追加。`seasons`, `season_rankings`等のテーブルを作成済み。
- **シーズンポイント初期値**: `rating`と同様に`1200`からスタート。
- **投票ポイント加算**: 投票時に`season_vote_points`が加算されるロジックを`vote_battle`関数に実装済み。
- **シーズンポイント更新**: バトル完了時にシーズンポイントを更新する`update_season_points_after_battle`関数を実装済み。

### 🚧 未実装・今後のタスク
- **自動シーズン切替**: pg_cronによる終了・順位確定・リセット処理の自動化。
- **フロントエンド改修**: ランキングページに「今シーズン」「通算」のタブを追加するなど、UIの全体的な対応。
- **テスト**: シーズン切り替えを想定した結合テスト。

---

このRulesに従って、BeatNexusプロジェクトの開発・運用を進めましょう！ 