# PostPage 現状仕様（2025-08-14 時点）

このドキュメントは、`src/pages/PostPage.tsx` の実装を読み取って現状の挙動を要約したものです。UI/UX の細部はコードに準拠し、文言は i18n キーで管理されています。

## 概要
- ページ目的: ユーザー動画の投稿 → ストレージ保存 → 投稿レコード作成 → マッチング Webhook の発火。
- ステップ遷移: `upload` → `preview` → `success`（`step` state）
- 前提: 認証必須。未ログインは `/` にリダイレクト。

## 主要依存
- Supabase
  - Storage バケット: `videos`
  - RPC: `create_submission_with_cooldown_check(p_user_id, p_video_url, p_battle_format)`
  - Edge Function Webhook: `functions/v1/submission-webhook`（`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`使用）
- FFmpeg（`useVideoProcessor()`）
  - 圧縮進行状況、ステージをモーダルで表示
- クールダウン/シーズン制約
  - `useSubmissionCooldown()` による 1時間制限等
  - `useSubmissionStatus()` によるシーズン中/外の判定とメッセージ

## 入出力・状態
- 入力: 動画ファイル（`video/*`）
- 内部状態:
  - `videoFile`, `videoPreviewUrl`, `videoDuration`
  - `step`（'upload' | 'preview' | 'success'）
  - チェック類: `acceptedGuidelines`, `acceptedFacePolicy`, `acceptedContent`
  - 進行/モーダル: `isSubmissionModalOpen`, `submissionProgress`, `submissionStage`, `submissionError`, `isSubmissionProcessing`, `isCompressing`
  - FFmpeg: `isProcessing`, `progress`, `compressionStage`, `isFFmpegLoaded`, `ffmpegError`
  - クールダウン: `canSubmit`, `remainingTime`, `cooldownInfo`

## バリデーション
- 動画長（バトル形式固定: `MAIN_BATTLE`）
  - 許容: 60〜120秒（`isValidDuration`）
  - 30秒/59秒/120秒などは他形式のため将来拡張を想定
- ファイルサイズ上限: 2GB（`MAX_FILE_SIZE`）
- 送信必須チェック（プレビュー画面）
  - 利用規約/ガイドライン同意（`acceptedGuidelines`）
  - 顔出し任意ポリシー理解（`acceptedFacePolicy`）
  - 自身のパフォーマンスである確認（`acceptedContent`）

## 圧縮/最適化
- 閾値 10MB を超える場合は圧縮を実施（iOS互換性とサイズ削減）
- 10MB未満でも軽い圧縮を試行（失敗時は元ファイル継続）
- 圧縮進捗は 10〜50% にマッピングしてモーダルに統合表示
- 圧縮後 50MB超は iOS での注意メッセージをステージ表示

## アップロード〜投稿作成フロー
1. 圧縮（必要に応じて）完了後、Storage `videos` に `user.id/uuid.ext` でアップロード
2. `getPublicUrl` で公開URLを取得
3. `create_submission_with_cooldown_check` を RPC 呼び出し
   - シーズン制限やクールダウン中は `success=false` かエラー
4. Edge Function `submission-webhook` を呼び出してマッチング実行
   - 成功/待機の双方を成功扱いで処理
5. 成功後、クールダウン情報を更新し、`success` 画面へ

## エラーハンドリング
- 動画長/ファイル処理/圧縮/アップロード/RPC/Webhook の各段階で詳細ログを出力
- モーダルやページ内カードでユーザーに文言表示（i18n）

## UI コンポーネント
- `Card`, `Button`, `SubmissionModal`, `MonthlyLimitCard`
- バナーやガイドライン説明カード（右カラム）はテキスト情報の提示

## i18n キー（抜粋）
- `postPage.errors.*`, `postPage.submissionGuidelines.*`, `submissionModal.*`, `postPage.upload.*`, `postPage.guidelines.*`, `postPage.buttons.*` 等
- 一部に `t(key, '既定文言')` のフォールバック指定あり

## 既知の制約/改善ポイント
- 同意事項はフロントのチェックのみで、DBに永続化されていない
- `battleFormat` は固定 `'MAIN_BATTLE'`（将来、選択式にする可能性）
- 既存投稿への再同意取得フローは未実装

---

# 変更要件（今回追加）
- 追加チェック: 「投稿動画の YouTube・SNS 等での編集/公開/二次利用に同意」
- 影響範囲:
  - プレビュー画面のチェック群に1項目追加
  - `handleSubmit`/`performSubmission` の送信前バリデーションに組み込み
  - 送信ボタンの `disabled` 条件に反映
- スタイリング: 既存チェックと同一（Tailwind クラス統一）
- 文言: i18n キー `postPage.submissionGuidelines.allowSNSUsage` を使用（未定義時はデフォルト文言）

## 後続（別タスク提案）
- DB: `submissions.usage_consent boolean not null default false` の追加と RPC 拡張
- ドキュメント: 規約/プライバシーポリシーへの反映、再同意導線の設計

---

## 利用規約・プライバシーポリシー現状まとめ（2025-08-14）

対象ファイル:
- `terms_of_service_ja.md`（最終更新 2025-07-18）
- `terms_of_service_en.md`（Last Updated: 2025-07-18）

主要ポイント（共通）
- 第5条（投稿コンテンツの権利 / Rights to Posted Content）
  - 著作権はユーザーに帰属。
  - ただし、サービスの提供・改善・宣伝広告（公式SNSでの紹介等を含む）に必要な範囲で、当社は無償で利用可能（複製、公衆送信、展示、頒布、翻訳、改変等）。
  - 著作者人格権の不行使に同意。
  - → 既に規約上、SNS掲載・編集・二次利用が許容される枠組みが明記済み。
- 第8条（個人情報の取扱い / Handling of Personal Information）
  - 別途「プライバシーポリシー」に従う旨の記載あり。

プライバシーポリシーの現状
- リポジトリ内を横断検索した結果、明示的なプライバシーポリシーファイル（ja/en）は未検出。
- そのため、規約の第8条で参照される本文が未整備の可能性あり。

ギャップとリスク
- フロントの「SNS利用同意」文言と規約第5条との表現差異（目的の列挙、利用範囲、撤回・オプトアウト可否/効果）を整合させる必要。
- プライバシーポリシー本文未整備による法令順守・告知の不足（収集項目、利用目的、第三者提供、共同利用、保存期間、国外移転、Cookie/広告ID、未成年者、問い合わせ窓口等）。
- 同意の監査性（取得時刻・IP・UA等のログ、保存場所）の不足。

推奨対応（提案）
- 規約（第5条）の表現を補強（非独占・世界的・無償・譲渡/サブライセンス可能、期間、撤回の将来効、既存公開物の扱い）。
- プライバシーポリシー（ja/en）を新規作成し、規約と整合。
- アプリ内で規約/ポリシーへのリンクを同意チェック近傍に掲示（UIは最小変更）。
- `usage_consent` のDB保存とセキュリティ監査ログへの記録（取得時刻/UA/IP）。
