# コミュニティスレッド コア機能仕様書

## 1. 背景と目的
- 既存のコミュニティ機能に常時交流できる掲示板型コンテンツを追加し、バトルや投票以外の参加動機を創出する。
- 投稿やリアクションをユーザーの投票ポイントに結びつけ、コミュニティ貢献度を定量化する。
- Redditライクなスレッド体験を実現しつつ、ビートボクサー特化要素として音声投稿をサポートする。

## 2. スコープ
### 2.1 実装対象
- コミュニティ単位のスレッド・投稿・リアクション機構。
- 音声ファイルを添付できる投稿UIとストレージハンドリング。
- 投稿・リアクションを起点とした投票ポイント加算ロジック。
- 最低限の表示ロジック（新着・トレンド・検索フィルタ）。
- モデレーション基盤（削除・凍結、RLS 設計）。

### 2.2 今回の除外事項（将来実装予定）
- バトル連携（バトル完了時の自動スレッド生成、バトルカードとの相互リンク）。
- 週次課題スレッドとサイトニュース掲載フロー。
- 投稿以外の投票ポイント加算（例: シェア、視聴時間）。

## 3. 高レベル要件
### 3.1 ユースケース
1. ユーザーがコミュニティ内でスレッドを立て、テキストと任意の音声を添付して投稿。
2. メンバーがスレッドに返信し、リアクション（Upvote/Insight/Fire）を付与。
3. 投稿やリアクションの獲得状況に応じて、シーズン投票ポイントへ加算イベントが発生。
4. 新着順・トレンド順でスレッドを閲覧し、検索・タグで絞り込み。
5. モデレーターが不適切な投稿を非表示/削除できる。

### 3.2 機能要件
- **スレッド生成**: タイトル、本文、オプションタグ（最大5件）、公開ステータス（`active`/`archived`）。
- **投稿**: テキスト必須、音声ファイル（mp3/wav、20MB以内）を1件添付可能。音声はSupabase Storage `community-audio` バケットに保存。
- **リアクション**: `upvote`, `insight`, `fire` の3種。ユーザー毎に1種類まで選択し、再選択で切り替え。またリアクション解除も可能。
- **投票ポイント加算**: スレッド作成者と投稿者がリアクションを獲得した際、`community_contribution_events` に記録後、バッチ処理で `profiles.season_vote_points` に加算。
- **表示ロジック**: 新着順 (`created_at` 降順)、トレンド順（投稿数 + リアクション重み + 最新活動）、キーワード・タグ検索。
- **通知**: スレッドへの直接返信と自分の投稿にリアクションが付与された際に通知。
- **モデレーション**: モデレーター/オーナーは投稿・スレッドを `is_deleted`/`status='archived'` に設定可能。アクションは `security_audit_log` に記録。

## 4. データモデリング
### 4.1 新規テーブル
```sql
community_threads (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
	creator_id uuid NOT NULL REFERENCES profiles(id),
	title text NOT NULL,
	body text,
	tags text[] DEFAULT '{}',
	status text DEFAULT 'active', -- enum化検討: active/archived/deleted
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now(),
	last_activity_at timestamptz DEFAULT now()
);

community_thread_posts (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	thread_id uuid NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
	author_id uuid NOT NULL REFERENCES profiles(id),
	body text NOT NULL,
	audio_url text,
	audio_duration_seconds integer,
	reply_to uuid REFERENCES community_thread_posts(id) ON DELETE SET NULL,
	vote_score integer DEFAULT 0,
	is_deleted boolean DEFAULT false,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

community_thread_reactions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	post_id uuid NOT NULL REFERENCES community_thread_posts(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES profiles(id),
	reaction_type text NOT NULL, -- enum: upvote/insight/fire
	created_at timestamptz DEFAULT now(),
	UNIQUE (post_id, user_id)
);

community_contribution_events (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	community_id uuid NOT NULL REFERENCES communities(id),
	user_id uuid NOT NULL REFERENCES profiles(id),
	source_type text NOT NULL, -- enum: thread_create/post_create/reaction_received
	source_id uuid NOT NULL,
	delta_points integer NOT NULL,
	season_id uuid,
	created_at timestamptz DEFAULT now()
);
```

### 4.2 補助構造
- ビュー `community_thread_activity_view` を作成し、スレッドの投稿数、リアクション数、最終アクティビティを集計。
- マテビュー `season_vote_points_from_threads` で当該シーズンの貢献ポイントを集計し、`profiles.season_vote_points` へ夜間バッチ更新。
- Supabase Storage バケット: `community-audio`（RLS: 所属コミュニティメンバーのみ read/list、投稿者+モデレーターのみ delete）。

### 4.3 RLS ポリシー概要
- スレッド/投稿/リアクションの `SELECT` は同一コミュニティ所属ユーザーに限定。
- `INSERT` はコミュニティメンバーのみ許可。モデレーター/オーナーは他ユーザーの投稿に対し `UPDATE`（削除・アーカイブ）可能。
- `community_contribution_events` はシステム関数を通じた `SECURITY DEFINER` インサートのみ許可し、直接操作禁止。

## 5. API / RPC 設計
| RPC | 概要 | 入力 | 主要処理 |
| --- | --- | --- | --- |
| `create_community_thread` | スレッド作成 | `p_community_id`, `p_title`, `p_body`, `p_tags` | RLSチェック、`community_threads` への挿入、`community_contribution_events` に初期ポイント登録、`last_activity_at` 更新 |
| `list_community_threads` | スレッド一覧取得 | `p_community_id`, `p_sort`, `p_keyword`, `p_tags`, `p_limit`, `p_offset` | `community_thread_activity_view` を用いたページング取得 |
| `create_thread_post` | 投稿作成 | `p_thread_id`, `p_body`, `p_audio_url`, `p_reply_to` | 投稿保存、音声メタ更新、ポイントイベント登録、`last_activity_at` 更新 |
| `toggle_thread_reaction` | リアクション付与/解除 | `p_post_id`, `p_reaction_type` | 既存リアクションの upsert/delete、投稿の `vote_score` 再計算、ポイントイベント反映 |
| `list_thread_posts` | 投稿一覧取得 | `p_thread_id`, `p_cursor`, `p_limit` | 投稿 + リアクション集計を返却。deleted投稿はモデレーターのみ閲覧可能 |
| `calculate_thread_contribution` | バッチ向け | `p_season_id` | `community_contribution_events` 集計し `profiles.season_vote_points` に反映 |

各RPCは `SECURITY DEFINER` で実装し、内部でユーザー所属チェックを徹底する。

## 6. フロントエンド仕様
- ページ: 既存コミュニティページに「スレッド」タブを追加。
- コンポーネント:
	- `ThreadList`（一覧 + ソート/フィルタ UI）
	- `ThreadComposer`（タイトル/本文/タグ/投稿ボタン、音声アップロードUI）
	- `ThreadDetail`（投稿のツリー表示、音声プレイヤー、リアクションボタン）
	- `PostComposer`（返信フォーム）
- 状態管理: `communityStore` にスレッド関連 slice を追加。キャッシュ・ページング・無限スクロールを実装。
- 音声アップロード: Supabase Storage クライアントを利用し、署名付きURLでアップロード。アップロード結果を `create_thread_post` に渡す。進捗表示とエラー処理を行う。
- 通知: 既存 `notifications` テーブルに `thread_reply`, `thread_reaction` タイプを追加し、Edge Function から送信。UIは既存通知トーストを再利用。

## 7. 投票ポイント加算ロジック
| イベント | 条件 | delta_points | 備考 |
| --- | --- | --- | --- |
| スレッド作成 | 1日上限3件。作成成功時 | +5 | スパム防止のため同日4件目以降は0ポイント |
| 投稿作成 | 1日上限10件。 | +2 | 本文100文字未満は +1 に減衰 |
| リアクション獲得 | 自分の投稿が初回リアクションを受けた時点 | +1 | 同一ユーザーからの複数リアクションは合算対象外 |
| リアクション多重閾値 | 同一投稿へのリアクション合計が10/25/50件に到達 | +3/+5/+10 | 一度だけ付与 |

- `community_contribution_events` で重複防止キー（`source_type`, `source_id`, `user_id`, `extra_key`）を保持し、同一イベントの再登録を防止。
- 夜間バッチまたはトリガーで `profiles.season_vote_points` に反映後、差分を通知に活用。

## 8. 非機能要件
- パフォーマンス: スレッド一覧はページング（20件）し、トレンドソート用の集計はマテビューを5分間隔でリフレッシュ。
- セキュリティ: RLS と `SECURITY DEFINER` RPC で権限を制御。音声ファイルはアップロード後に検証用キューへ。
- モニタリング: Edge Function とRPCに計測ログを追加し、エラーは Sentry / Supabase Log に送信。
- アクセシビリティ: 音声投稿には簡易キャプション入力を推奨し、未入力時は投稿者名と投稿日時を読み上げ。

## 9. テスト観点
- 単体: RPC ごとの権限/バリデーション、ストレージアップロード成功/失敗、ポイントイベント重複防止。
- 結合: スレッド作成→投稿→リアクション→ポイント加算の一連フロー。
- RLS: 異なるコミュニティからのアクセス遮断、モデレーター権限確認。
- 回帰: 既存コミュニティチャット機能との衝突が無いか確認。

## 10. 実装計画
### Phase 1: データ層整備 (約1週)
1. マイグレーション作成 (`community_threads`, `community_thread_posts`, `community_thread_reactions`, `community_contribution_events`)。
2. RLS ポリシー実装 + pgTap テスト。
3. ストレージバケット `community-audio` 設定、ポリシー適用。

### Phase 2: RPC / Edge 関数 (約1週)
1. コア RPC 実装 (`create_community_thread`, `list_community_threads`, `create_thread_post`, `toggle_thread_reaction`, `list_thread_posts`)。
2. `community_contribution_events` 集計関数と夜間ジョブ（pg_cron）整備。
3. 通知発火ロジック追加（既存通知システムを再利用）。

### Phase 3: フロントエンド (約2週)
1. Zustand ストア拡張、API クライアント実装。
2. スレッド一覧/詳細/投稿コンポーネント開発、音声アップロードUI統合。
3. 通知・ポイント反映UI（ポイント増加時のトーストやプロフィール反映）。

### Phase 4: QA & リリース準備 (約0.5週)
1. E2E テスト（新着表示、トレンドソート、RLS）。
2. ストレージ利用量試験、レート制限確認。
3. ドキュメント更新と `.cursor/docs/dev-rules/` への実装ログ追加準備。

## 11. 今後の拡張
- バトル連携 Edge Function、週次課題ロジックは別仕様で詳細化予定。
- リアクション種別拡張や音声解析（波形表示・自動タグ付け）をフェーズ2以降で検討。
