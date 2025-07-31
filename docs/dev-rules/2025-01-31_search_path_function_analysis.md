# search_path未設定関数詳細調査レポート

## 概要
開発環境（wdttluticnlqzmqmfvgt）で検出されたsearch_path未設定関数: **81個**

search_path設定を一つずつ行っていく。既存の機能は絶対変えないで。その際、既存の関数との整合性を考えて、マイグレーションファイルを作成していく。関数の中で別の関数を呼び出しているようであれば、その関数にsearch_pathが設定されているかも確認して、修正する。
最後に関数がしっかり機能するかをテストして、本番環境に適用する。そして最終的なマイグレーションファイルを作成してください。

## 関数一覧（カテゴリ別分類）

### 1. 管理・認証系関数（最高優先度）
- ✅ admin_force_release_email (2025-01-31 完了)
- admin_force_release_email_v2
- ✅ auto_release_deleted_emails (2025-01-31 完了)
- check_phone_availability
- ✅ normalize_phone_number (既存設定済み)
- ✅ record_phone_verification (2025-01-31 完了)
- ✅ log_audit_event (既存設定済み)
- setup_custom_email_templates

### 2. ユーザー・アカウント管理系（高優先度）
- ✅ safe_delete_user_account (2025-01-31 完了)
- ✅ safe_delete_user_account_v4 (2025-01-31 完了)
- ✅ auto_set_user_language (2025-01-31 完了)
- ✅ set_user_language_from_browser (2025-01-31 完了)
- ✅ update_user_language (2025-01-31 完了)
- ✅ update_user_avatar (2025-01-31 完了)
- ✅ update_user_profile_details (2025-01-31 完了)
- ✅ get_user_profile (2025-01-31 完了)
- ✅ get_user_email_language (2025-01-31 完了)
- ✅ update_onboarding_status (2025-01-31 完了)
- ✅ handle_new_user (既存設定済み)
- sync_user_community
- get_user_current_community

### 3. レーティング・計算系関数（高優先度）
- ✅ calculate_elo_rating (2025-01-31 完了)
- ✅ calculate_elo_rating_change (2025-01-31 完了)
- ✅ calculate_elo_rating_with_format (2025-01-31 完了)
- ✅ calculate_tie_rating_with_format (2025-01-31 完了)
- ✅ get_k_factor_by_format (2025-01-31 完了) (text版とenum版の2つのオーバーロード)
- ✅ update_battle_ratings_safe (2025-01-31 完了)
- ✅ update_season_points_after_battle (2025-01-31 完了)

### 4. バトル・マッチング系関数（高優先度）
- ✅ complete_battle_with_video_archiving (2025-01-31 完了)
- ✅ progressive_matchmaking (2025-01-31 完了)
- ✅ process_expired_battles (2025-01-31 完了)
- ✅ can_submit_video (2025-01-31 完了)
- ✅ check_submission_cooldown (2025-01-31 完了)
- ✅ create_submission_with_cooldown_check (2025-01-31 完了)
- ✅ withdraw_submission (2025-01-31 完了)
- ✅ get_submission_status (2025-01-31 完了)
- ✅ get_waiting_submissions (2025-01-31 完了)
- ✅ find_match_and_create_battle (2025-01-31 完了)
- ✅ submit_video (2025-01-31 完了)

### 5. 投票系関数（中優先度）
- ✅ vote_battle_with_comment (2025-01-31 完了)
- ✅ vote_battle_fixed (2025-01-31 完了) ※開発環境のみ
- ✅ cancel_vote (2025-01-31 完了)
- ✅ get_user_vote (2025-01-31 完了)
- ✅ vote_battle (2025-01-31 完了)

### 6. シーズン・ランキング系関数（中優先度）
- ✅ end_current_season (既存設定済み)
- ✅ start_new_season (既存設定済み) ※重要機能・本番同期完了
- ✅ get_active_season (既存設定済み)
- ✅ get_all_seasons (既存設定済み)
- ⏭️ grant_season_rewards (2025-01-31 スキップ - 未使用)
- ✅ get_season_rankings_by_id (既存設定済み - 使用中)
- ✅ get_season_voter_rankings_by_id (既存設定済み - 使用中)
- ✅ get_top_rankings (既存設定済み)
- ✅ get_top_voter_rankings (既存設定済み)
- ⏭️ get_user_rank (2025-01-31 スキップ - 未使用・動作不良)
- ⏭️ get_user_voter_rank (2025-01-31 スキップ - 未使用・動作不良)

### 7. コミュニティ系関数（中優先度）
- create_community
- delete_community
- join_community
- leave_community
- kick_member_from_community
- update_member_role
- update_community_stats
- update_community_stats_trigger

### 8. 通知・コメント系関数（中優先度）
- ✅ notify_battle_created_trigger (2025-01-31 完了)
- ✅ notify_battle_completed_trigger (2025-01-31 完了)
- ✅ notify_vote_cast_trigger (2025-01-31 完了)
- ✅ get_battle_comments (2025-01-31 完了)
- ✅ update_post_comments_count (2025-01-31 完了)

### 9. ユーティリティ・支援系関数（低優先度）
- handle_updated_at
- update_updated_at_column
- get_rank_from_rating
- get_rank_color_from_rating
- get_original_email_hint
- call_edge_function

### 10. 削除・クリーンアップ系関数（中優先度）
- ✅ cleanup_all_deleted_user_videos (2025-01-31 完了) ※再帰呼び出しバグ修正済み
- ✅ delete_user_videos_from_storage (2025-01-31 完了)

## 次のステップ
1. 各関数の詳細定義を確認
2. 引数・戻り値型を正確に把握
3. 既存の関数本体を保持したまま`SET search_path = public, auth`のみ追加
4. 優先度順にマイグレーションファイルを作成

## 確認が必要な重複関数
- `get_k_factor_by_format`: 2つの異なるcache_keyが存在（オーバーロード？）
