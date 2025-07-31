# Phase 4: Function Search Path セキュリティ強化実施計画書

## 文書概要

| 項目 | 内容 |
|------|------|
| 文書名 | Phase 4 Function Search Path セキュリティ強化実施計画書 |
| 作成日 | 2025-01-31 |
| 対象システム | BeatNexus Supabaseデータベース |
| 対象環境 | 本番環境（qgqcjtjxaoplhxurbpis）・開発環境（wdttluticnlqzmqmfvgt） |
| 優先度 | 高（セキュリティクリティカル） |
| 前提条件 | Phase 3完了済み（7関数のsearch_path設定済み） |

## 1. 現状分析

### 1.1 未対応関数数
- **本番環境**: 81関数（search_path未設定）
- **開発環境**: 79関数（search_path未設定）
- **Phase 3で対応済み**: 7関数（両環境）

### 1.2 本番環境のみ存在する関数
- `public.process_expired_battles` - バトル期限切れ処理関数
- `public.end_current_season` - シーズン終了関数

### 1.3 脆弱性レベル分析
**SQLインジェクション攻撃リスク**: search_path未設定により、悪意のあるスキーマ操作でシステム侵害の可能性

## 2. 優先度分類

### 2.1 最高優先度（即座対応必要）
**管理・認証系関数** - システム権限に直接影響

| 関数名 | 機能 | リスク評価 |
|--------|------|----------|
| `admin_force_release_email` | 管理者メール解放 | Critical |
| `admin_force_release_email_v2` | 管理者メール解放v2 | Critical |
| `handle_new_user` | 新規ユーザー処理 | Critical |
| `safe_delete_user_account` | アカウント削除 | Critical |
| `safe_delete_user_account_v4` | アカウント削除v4 | Critical |
| `check_rate_limit` | レート制限チェック | High |
| `log_security_event` | セキュリティログ | High |

### 2.2 高優先度
**コア機能系関数** - ゲームロジックに直接影響

| 関数名 | 機能 | リスク評価 |
|--------|------|----------|
| `calculate_elo_rating` | ELOレーティング計算 | High |
| `calculate_elo_rating_with_format` | 形式別ELO計算 | High |
| `calculate_elo_rating_change` | ELO変動計算 | High |
| `calculate_tie_rating_with_format` | 引き分けレーティング | High |
| `progressive_matchmaking` | マッチング機能 | High |
| `vote_battle_with_comment` | 投票機能 | High |
| `complete_battle_with_video_archiving` | バトル完了処理 | High |

### 2.3 中優先度
**コミュニティ・ユーザー管理系関数**

| 関数名 | 機能 | リスク評価 |
|--------|------|----------|
| `create_community` | コミュニティ作成 | Medium |
| `delete_community` | コミュニティ削除 | Medium |
| `join_community` | コミュニティ参加 | Medium |
| `leave_community` | コミュニティ退出 | Medium |
| `update_user_profile_details` | プロフィール更新 | Medium |
| `update_user_avatar` | アバター更新 | Medium |

### 2.4 低優先度
**補助・支援系関数**

| 関数名 | 機能 | リスク評価 |
|--------|------|----------|
| `get_user_profile` | プロフィール取得 | Low |
| `get_user_rank` | ランク取得 | Low |
| `get_top_rankings` | ランキング取得 | Low |
| `get_battle_comments` | バトルコメント取得 | Low |

## 3. 実装戦略

### 3.1 段階的実装アプローチ

#### Step 1: 最高優先度関数対応（即座実施）
**対象**: 7関数（管理・認証系）
**期間**: 即座実施
**リスク**: 低（読み取り専用関数中心）

#### Step 2: 高優先度関数対応（1日以内）
**対象**: 7関数（コア機能系）
**期間**: 1日以内
**リスク**: 中（ゲーム機能への影響可能性）

#### Step 3: 中優先度関数対応（3日以内）
**対象**: 20関数（コミュニティ・ユーザー管理）
**期間**: 3日以内
**リスク**: 中（コミュニティ機能への影響可能性）

#### Step 4: 低優先度関数対応（1週間以内）
**対象**: 残り関数（補助・支援系）
**期間**: 1週間以内
**リスク**: 低（主に読み取り機能）

### 3.2 マイグレーションファイル構成

```
supabase/migrations/
├── 20250131140000_phase4_step1_critical_functions_search_path.sql
├── 20250131140001_phase4_step2_core_functions_search_path.sql
├── 20250131140002_phase4_step3_community_functions_search_path.sql
├── 20250131140003_phase4_step4_support_functions_search_path.sql
└── 20250131140004_phase4_prod_only_functions_search_path.sql
```

## 4. 実装内容詳細

### 4.1 Step 1: 最高優先度関数（管理・認証系）

```sql
-- 20250131140000_phase4_step1_critical_functions_search_path.sql

-- 管理者機能の強化
CREATE OR REPLACE FUNCTION public.admin_force_release_email(target_email text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
-- 既存の関数内容をそのまま維持
$function$;

CREATE OR REPLACE FUNCTION public.admin_force_release_email_v2(target_email text)
RETURNS json
SECURITY DEFINER  
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
-- 既存の関数内容をそのまま維持
$function$;

-- ユーザー管理機能の強化
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
-- 既存の関数内容をそのまま維持
$function$;

CREATE OR REPLACE FUNCTION public.safe_delete_user_account(user_id_to_delete uuid)
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
-- 既存の関数内容をそのまま維持
$function$;

CREATE OR REPLACE FUNCTION public.safe_delete_user_account_v4(user_id_to_delete uuid)
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
-- 既存の関数内容をそのまま維持
$function$;

-- セキュリティ機能の強化
CREATE OR REPLACE FUNCTION public.check_rate_limit(user_id uuid, action_type text, limit_count integer, time_window interval)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
-- 既存の関数内容をそのまま維持
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, event_data jsonb)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
-- 既存の関数内容をそのまま維持
$function$;
```

### 4.2 Step 2: 高優先度関数（コア機能系）

```sql
-- 20250131140001_phase4_step2_core_functions_search_path.sql

-- レーティング計算関数群
CREATE OR REPLACE FUNCTION public.calculate_elo_rating(winner_rating integer, loser_rating integer, k_factor integer DEFAULT 32)
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
-- 既存の関数内容をそのまま維持
$function$;

-- その他のコア機能関数も同様に設定
```

## 5. リスク管理

### 5.1 実装リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 関数実行エラー | High | 段階的デプロイ・ロールバック準備 |
| パフォーマンス低下 | Medium | 実行前後の監視 |
| アプリケーション停止 | High | 開発環境での十分な検証 |

### 5.2 緊急時対応

```sql
-- ロールバック用クエリ例
CREATE OR REPLACE FUNCTION public.admin_force_release_email(target_email text)
RETURNS boolean
SECURITY DEFINER
-- search_path設定を削除してロールバック
LANGUAGE plpgsql
AS $function$
-- 元の関数内容
$function$;
```

## 6. 検証・監視計画

### 6.1 事前検証
1. **開発環境での全関数テスト**
2. **既存機能の回帰テスト**
3. **パフォーマンステスト**

### 6.2 事後監視
1. **Supabase Advisors監視**（実装後1時間以内に0件確認）
2. **アプリケーションログ監視**（エラー発生監視）
3. **データベースパフォーマンス監視**

## 7. 成功基準

### 7.1 技術的指標
- [ ] search_path未設定関数: 0件（両環境）
- [ ] 既存機能の動作: 100%維持
- [ ] セキュリティスキャン: 警告0件

### 7.2 運用指標
- [ ] アプリケーション停止時間: 0分
- [ ] ユーザー影響: 0件
- [ ] パフォーマンス劣化: 5%以内

## 8. 実装スケジュール

| Phase | 期間 | 担当 | 成果物 |
|-------|------|------|--------|
| Step 1 | 即座 | 開発チーム | 最高優先度7関数対応 |
| Step 2 | Day 1 | 開発チーム | 高優先度7関数対応 |
| Step 3 | Day 1-3 | 開発チーム | 中優先度20関数対応 |
| Step 4 | Day 4-7 | 開発チーム | 残り関数対応 |
| 検証 | Day 7-8 | QAチーム | 全機能テスト完了 |

---

**承認・実装責任者**: 開発チーム  
**緊急連絡先**: セキュリティチーム  
**次回レビュー**: 実装完了後48時間以内
