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
- **シーズン報酬システム**: バッジ・アイコンフレーム付与による成果表彰制度
- **ニュースカルーセル**: お知らせ・重要情報の動的表示システム
- **多言語対応**: 日本語・英語完全対応・その他翻訳ファイルに入っている言語

## 🛠️ 技術スタック
- **フロントエンド**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **バックエンド**: Supabase (PostgreSQL + Edge Functions + Storage + Auth)
- **定期処理**: pg_cron（バトル終了処理5分間隔、マッチメイキング30分間隔・理想的な時間ベース緩やかなレート制限緩和）
- **国際化**: react-i18next
- **プッシュ通知**: Web Push API + Supabase Edge Functions
- **セキュリティ**: XSS防止、URL検証、セキュリティ監査ログ
- **事前登録システム**: 限定アクセス制御（pre_registered_users）
- **デプロイ**: Supabase（プロジェクトID: 本番用`qgqcjtjxaoplhxurbpis`, 開発環境用 `wdttluticnlqzmqmfvgt`）

## 🧪 開発プロセス重要ルール
**⚠️ 必須**: 新機能実装は必ずテストDB環境(`wdttluticnlqzmqmfvgt`)で開始してください！
詳細ルールは `2025-06-28_test_database_development_rules.mdc` を参照

## 📁 ディレクトリ構成
```
src/
├── assets/             # 画像・アイコン・モーション等の静的アセット
├── components/         # UIコンポーネント群
│   ├── admin/         # 管理者向けUI（審査・設定用）
│   ├── ads/           # 広告コンポーネント（バナー / インフィード）
│   ├── auth/          # 認証・サインイン関連
│   ├── battle/        # バトルカード / 集計表示
│   ├── debug/         # デバッグ・検証用UI
│   ├── home/          # 旧ホーム画面セクション（現在は主に再利用用）
│   ├── layout/        # ヘッダー・フッター・背景装飾
│   ├── onboarding/    # オンボーディングモーダル / スライド
│   ├── payments/      # 決済・Super Tip UI
│   ├── privacy/       # プライバシー表示（利用規約等）
│   ├── profile/       # プロフィール編集・表示
│   ├── rewards/       # シーズン報酬 / バッジ表示
│   ├── seo/           # メタデータ / OG表現
│   └── ui/            # 汎用UI（モーダル / カード / 表示部品）
├── config/             # 設定ファイル（広告設定・環境依存の構成）
├── data/               # UI表示用のスタティックデータ
├── edge-functions/     # フロントエンド内で使用するEdge Functionクライアント
│   └── ads/           # 広告用ヘルパー（プリフェッチ等）
├── hooks/              # カスタムフック（投稿制限・SEO・通知等）
├── i18n/               # 国際化設定（初期化ロジック）
│   └── locales/        # 翻訳ファイル（`en.json`, `ja.json`ほか）
├── lib/                # Supabaseクライアント / APIラッパー
├── pages/              # ルーティング対象のページコンポーネント
│   ├── HomepageTestPage.tsx  # **現在使用中のホームページ**（/）
│   ├── HomePage.tsx          # 旧ホームページ（/old-homepage）
│   └── ...                   # BattlesPage.tsx, RankingPage.tsx など
├── store/              # Zustandストア（バトル / ランキング / 通知 等）
├── types/              # TypeScript型定義（広告・バトル・報酬など）
└── utils/              # ヘルパー関数（URL検証・フォーマッタ 等）

supabase/
├── migrations/         # SQLマイグレーション（180本以上）
├── functions/          # Edge Functions (Deno + TypeScript)
│   ├── ad-*            # 広告配信 / トラッキング / 計測
│   ├── create-*        # Stripe / Super Tip作成ワークフロー
│   ├── notify-*        # バトル・投票通知
│   ├── ogp-*           # OGP生成（バトルカード / 汎用ページ）
│   ├── phone-verification-* # 電話番号認証関連
│   ├── submission-webhook/  # マッチング処理
│   ├── delete-user-account/ # アカウント削除
│   └── validate-preregistration/ # 事前登録検証
└── _shared/            # 共有設定（`import_map.json` 等）

docs/
├── BeatNexus.md                           # プロジェクト概要（このファイル）
├── design-specification.md                # UI/UX設計全般
├── BeatNexus_広告配信システム完全仕様書.md      # 広告配信の完全仕様
├── BattleCard_VotedBadge_仕様書.md          # 投票済みバッジ仕様
├── AuthModalパスワード変更機能実装仕様書.md    # 認証モーダル仕様
├── ...                                    # 各種仕様書・分析ドキュメント
└── dev-rules/                           # 実装ログディレクトリ（180+ files）
```
### 主要テーブル（最新スキーマ）
```sql
-- ユーザープロフィール
profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  email text NOT NULL,
  bio text,
  rating integer DEFAULT 1200,
  language varchar DEFAULT 'ja',
  vote_count integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  has_seen_onboarding boolean DEFAULT false,
  current_community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  season_points integer DEFAULT 1200,
  season_vote_points integer DEFAULT 0,
  phone_number varchar,
  phone_verified boolean DEFAULT false,
  stripe_account_id text,
  stripe_charges_enabled boolean DEFAULT false,
  stripe_connect_account_id text,
  instagram_id varchar
)

-- 投稿動画
submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  video_url text,
  status submission_status DEFAULT 'WAITING_OPPONENT',
  rank_at_submission integer,
  active_battle_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  battle_format battle_format,
  stream_video_id text,
  stream_status text DEFAULT 'pending',
  stream_thumbnail_url text,
  stream_preview_url text,
  stream_error_message text,
  one_line_comment text
)

-- アクティブバトル
active_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_submission_id uuid NOT NULL,
  player2_submission_id uuid NOT NULL,
  status battle_status DEFAULT 'ACTIVE',
  votes_a integer DEFAULT 0,
  votes_b integer DEFAULT 0,
  end_voting_at timestamptz DEFAULT (now() + INTERVAL '5 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  player1_user_id uuid NOT NULL REFERENCES profiles(id),
  player2_user_id uuid NOT NULL REFERENCES profiles(id),
  battle_format battle_format NOT NULL,
  season_id uuid
)

-- 投票
battle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES active_battles(id),
  user_id uuid REFERENCES profiles(id),
  vote char(1) CHECK (vote IN ('A', 'B')),
  created_at timestamptz DEFAULT now(),
  comment text,
  season_id uuid,
  super_tip_amount integer,
  stripe_payment_intent_id text,
  payment_status text,
  super_tip_id uuid,
  is_super_tip_vote boolean DEFAULT false,
  score_sheet jsonb
)

-- アーカイブ投票（保存機能）
archived_battle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_battle_id uuid NOT NULL REFERENCES archived_battles(id),
  user_id uuid REFERENCES profiles(id),
  vote char(1) CHECK (vote IN ('A', 'B')),
  comment text,
  created_at timestamptz DEFAULT now(),
  super_tip_amount integer,
  stripe_payment_intent_id text,
  payment_status text,
  has_super_tip boolean DEFAULT false,
  score_sheet jsonb
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
  season_id uuid
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
  type varchar NOT NULL,
  is_read boolean DEFAULT false,
  related_battle_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  related_season_id uuid,
  related_site_news_id uuid,
  related_reward_id uuid,
  related_super_tip_id uuid
)

-- プッシュ通知購読
push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  subscription jsonb NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- サイトニュース
site_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  link_url text,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  content_type text DEFAULT 'article',
  article_content text,
  meta_description text,
  tags text[],
  is_featured boolean DEFAULT false,
  is_published boolean DEFAULT true,
  display_order integer DEFAULT 0,
  language varchar DEFAULT 'en'
)

-- セキュリティ監査ログ
security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  phone_number_hash text,
  event_data jsonb NOT NULL,
  severity_level integer DEFAULT 1,
  ip_address inet,
  user_agent text,
  request_id text,
  is_blocked boolean DEFAULT false,
  admin_reviewed boolean DEFAULT false,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
)

-- シーズンマスタ
seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- シーズンランキング（スナップショット）
season_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  rank integer NOT NULL,
  points integer NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- シーズン投票者ランキング（スナップショット）
season_voter_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  rank integer NOT NULL,
  votes integer NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- 報酬マスタ
rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  image_url text NOT NULL,
  season_id uuid REFERENCES seasons(id),
  rank_requirement integer,
  min_battles integer DEFAULT 0,
  is_limited boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  description_en text,
  description_ja text
)

-- ユーザー報酬所有
user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  reward_id uuid NOT NULL REFERENCES rewards(id),
  earned_at timestamptz DEFAULT now(),
  earned_season_id uuid REFERENCES seasons(id)
)
```
  status text CHECK (status IN ('upcoming', 'active', 'ended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- シーズンランキング (スナップショット)
season_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  rank integer NOT NULL,
  points integer NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- シーズン投票者ランキング (スナップショット)
season_voter_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  rank integer NOT NULL,
  votes integer NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- ✅ シーズン報酬システム（完全実装）
-- 報酬マスター
rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text CHECK (type = 'badge') DEFAULT 'badge',
  image_url text NOT NULL,
  season_id uuid REFERENCES seasons(id),
  rank_requirement integer,
  min_battles integer DEFAULT 0,
  is_limited boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- ユーザー報酬所有
user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  reward_id uuid NOT NULL REFERENCES rewards(id),
  earned_at timestamptz DEFAULT now(),
  earned_season_id uuid REFERENCES seasons(id)
)
```### ENUMタイプ
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
   - 形式別Kファクター: MAIN_BATTLE(32), MINI_BATTLE(24), 
   
   
8. **`update_battle_ratings_safe(p_battle_id, p_winner_id)`** ✅ **実際の主要関数**
   - **削除ユーザー対応**: `is_deleted`フラグをチェックし、削除済みユーザーはレーティング更新をスキップ
   - **Eloレーティング計算**: `calculate_elo_rating_with_format()`を使用してバトル形式別のレーティング更新
   - **プロフィール更新**: `updated_at`タイムスタンプも同時更新
   - **戻り値**: レーティング変動量を含むJSON形式で結果を返却

### 投票・ユーザー管理
9. **`vote_battle(p_battle_id, p_vote)`** ✅ **シンプル投票（+1pt）**
   - **機能**: コメントなしの気軽な投票（'A' または 'B'）
   - **ポイント**: +1ポイント（通算投票数・シーズン投票ポイント両方）
   
10. **`vote_battle_with_comment(p_battle_id, p_vote, p_comment)`** ✅ **コメント付き投票（+3pt）**
    - **機能**: コメント付きの詳細な投票（ボーナスポイント）
    - **ポイント**: +3ポイント（通算投票数・シーズン投票ポイント両方）
    
11. **`get_user_vote(p_battle_id)`**
    - ユーザーの投票状況確認
    
12. **`cancel_vote(p_battle_id)`**
    - **投票取り消し機能**: シンプル投票（-1pt）、コメント付き投票（-3pt）
   
13. **`update_user_profile_details(p_user_id, p_username, p_bio)`**
    - プロフィール更新

14. **`update_user_avatar(p_user_id, p_avatar_url)`**
    - アバター更新

15. **`update_onboarding_status(p_user_id, p_has_seen)`** ✅ **オンボーディング管理**
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

28. **`can_submit_video()` & `get_submission_status()`**
    - **シーズン制限チェック**: シーズン終了1日前からの投稿制限（2025年8月23日実装）
    - **統合判定**: 24時間制限とシーズン制限の両方をチェック
    - **UI連携**: フロントエンドでの制限状況表示と適切なエラーメッセージ

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
    - **形式別Kファクター**: MAIN_BATTLE(32), MINI_BATTLE(24), 
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


## 🔧 Edge Functions（実装済み）
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

### `/save-user-timezone` ✅ **タイムゾーン保存**
- **機能**: ユーザーのタイムゾーン情報を自動保存
- **処理**: `Intl.DateTimeFormat().resolvedOptions().timeZone`で取得
- **用途**: 地域別の時間表示、季節・時間帯分析
- **権限**: 認証済みユーザーのみ

### ニュースシステム関連 ✅ **新規実装**
### `/news-webhook` ✅ **ニュース記事自動取得**
- **機能**: 外部APIからビートボクシング関連ニュースを自動収集
- **処理フロー**:
  1. NewsAPI（newsapi.org）からビートボクシング関連記事を検索
  2. 重複チェック（URL・タイトルベース）
  3. コンテンツフィルタリング（スパム・無関係記事除去）
  4. `site_news`テーブルに自動保存
- **スケジュール**: pg_cronで定期実行（日次）
- **エラーハンドリング**: API制限・ネットワークエラー対応


### 管理者システム関連 ✅
### `/admin-news` ✅ **ニュース管理**
- **機能**: 管理者によるニュース記事の手動作成・管理
- **権限**: 管理者権限チェック必須
- **処理**: CRUD操作（作成・読取・更新・削除）
- **フィールド**: タイトル・内容・画像URL・公開状態


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

### 最新機能の実装状況 ✅ **全て実装完了**

### ニュースシステム ✅ **2025-07-23実装完了**
- **自動ニュース収集**: NewsAPIを使用した外部記事の自動取得・分類
- **カルーセル表示**: 最新3件の記事をスライダー形式で表示
- **管理者機能**: 手動記事作成・編集・削除・公開制御
- **レスポンシブ対応**: PC・モバイル両対応のUI/UX
- **データベース**: `site_news`テーブルで記事情報管理
- **セキュリティ**: 管理者権限チェック・コンテンツフィルタリング

### 事前登録システム ✅ **2025-07-22実装完了**
- **事前登録フォーム**: メール・電話番号による事前登録受付
- **重複防止**: 同一メール・電話番号の重複登録防止
- **自動メール送信**: 登録完了時のHTMLメール配信
- **管理機能**: 登録者一覧・統計・データエクスポート
- **データベース**: `pre_registered_users`テーブルで登録情報管理
- **プライバシー**: 個人情報の適切な暗号化・保護

### シーズン報酬システム ✅ **2025-07-22実装完了**
- **自動報酬配布**: シーズン終了時のランク別報酬自動付与
- **称号システム**: ランクに応じた称号・バッジの付与
- **履歴管理**: 報酬取得履歴の永続化・表示
- **ランクティア**: Bronze/Silver/Gold/Platinum/Diamond/Master/Grandmaster
- **データベース**: `rewards`・`user_rewards`テーブルで報酬管理
- **重複防止**: 同一シーズン・ユーザーの重複報酬防止

### 投票システム強化 ✅ **2025-07-11実装完了**
- **二段階投票**: シンプル投票（+1pt）・コメント付き投票（+3pt）
- **ポイントシステム**: 投票種類に応じた差別化ポイント付与
- **投票履歴**: アーカイブシステムによる投票履歴の永続保存
- **取り消し機能**: 投票後の取り消し・ポイント適切な減算処理
- **データベース**: `archived_battle_votes`テーブルで履歴管理

### セキュリティ強化 ✅ **2025-07-26実装完了**
- **セキュリティ監査**: 包括的なセキュリティホール調査・修正
- **監査ログ**: `security_audit_log`テーブルでセキュリティイベント記録
- **RLS強化**: 全テーブルでのRow Level Security強化
- **SQL injection対策**: パラメータ化クエリの徹底実装
- **権限管理**: 管理者権限の厳格な検証・制御

### データ永続化システム ✅ **継続実装中**
- **バトルアーカイブ**: 終了バトルの完全データ保存
- **動画URL永続保存**: ストレージ移行による動画の永続アクセス
- **投票履歴保存**: `archived_battle_votes`による全投票記録の保管
- **統計データ**: レーティング変動・パフォーマンス履歴の長期保存
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

## 🔴 **重要: マイグレーション管理の徹底**
### **DB変更時の必須手順**
- **DB関係の修正を行う際は、必ずマイグレーションファイルを作成してアーカイブすること**
- **MCP SERVERを使ってSupabaseマイグレーションを実行する際も、必ずマイグレーションファイルを先に作成してからMCPで実行すること**
- **マイグレーションの内容を変更・修正した場合も、作成したマイグレーションファイルにその変更を反映させること**
- **マイグレーションファイルは `supabase/migrations/` ディレクトリに保存すること**
- **本番環境への適用を考慮し、開発環境での十分なテスト後に本番適用すること**

### **Supabase環境情報**
- **開発環境プロジェクトID**: `wdttluticnlqzmqmfvgt`
- **本番環境プロジェクトID**: `qgqcjtjxaoplhxurbpis`

### 新機能追加時
1. **🚨 マイグレーションファイル作成**: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`に変更内容を記録
2. **DB変更**: MCP toolsでマイグレーション適用（開発環境 → 本番環境の順）
3. **型定義**: `src/types/`更新
4. **ストア**: 必要に応じてZustandストア更新
5. **コンポーネント**: UI実装（国際化必須）
6. **翻訳**: `en.json`と`ja.json`更新

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


---

このRulesに従って、BeatNexusプロジェクトの開発・運用を進めましょう！ 