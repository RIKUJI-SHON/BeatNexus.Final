# BeatNexus バトル形式仕様書（MAIN_BATTLE / MINI_BATTLE）

最終更新: 2025-09-03  
バージョン: v1.0  
関連: [BeatNexus.md](./BeatNexus.md), [マッチング・投稿機能仕様書](./マッチング・投稿機能仕様書.md), [バトル終了・結果集計・レーティング計算システム仕様書](./バトル終了・結果集計・レーティング計算システム仕様書.md)

---

## 1. 目的と範囲
本書は BeatNexus のバトル形式「MAIN_BATTLE」と「MINI_BATTLE」に関する共通・相違仕様を統一的に定義します。投稿・マッチング・動画長さ・レーティング・シーズンポイント・UI表記・運用上の注意をカバーし、フロントエンド/バックエンド/DBで遵守すべき要件を明確化します。

---

## 2. 用語
- MAIN: MAIN_BATTLE を指す
- MINI: MINI_BATTLE を指す
- 形式（format）: battle_format 列に格納されるバトル種別（ENUM）

---

## 3. 形式ごとのルール概要（比較）

- 動画長さ（厳密・両端含む）
  - MAIN: 60〜120秒（inclusive）
  - MINI: 30〜60秒（inclusive）
  - 備考: 60秒は MAIN/MINI の両形式に適合。投稿時にユーザーが形式を明示選択する。

- 形式説明（訴求コピー）
  - MINI: フリースタイルで気軽に挑戦しよう！

- レーティング（EloのKファクター）
  - MAIN: K = 64
  - MINI: K = 32（MAINのちょうど半分）

- シーズンポイント（固定配点 + 連敗デケイ）
  - MAIN: 勝 +32 / 引分 +8 / 負 4→2→0（連敗0回→1回→2回以上）
  - MINI: 勝 +16 / 引分 +4 / 負 2→1→0（MAINのちょうど半分）
  - 下限: プロフィールの season_points は 1100 を下回らない（GREATEST運用）

- マッチング（形式分離）
  - MAIN と MINI は互いにマッチしない（battle_format 完全一致が必須）
  - 即時マッチング: レート差 ±50 → 見つからなければ ±100 の二段階
  - 段階的マッチング: 待機時間で許容差を拡大（0-3h:±100 / 3-12h:±200 / 12-24h:±400 / 24h+:無制限）

- UI表記
  - バトルカードに形式タグ（MAIN / MINI）を表示
  - 投稿画面に形式トグルを設置。形式に応じて規定（時間範囲等）を切替表示

---

## 4. 投稿とアップロードの仕様
- 入力: ユーザーは投稿時に battle_format（MAIN/MINI）を選択
- 動画長さバリデーション（クライアント + Edge Function 双方で実施）
  - MAIN: 60〜120s（含む）
  - MINI: 30〜60s（含む）
- Cloudflare Stream 直アップロード
  - Edge Function: upload-video-stream（direct upload URL発行）
  - 発行時に maxDurationSeconds を形式に合わせて設定（MAIN:120 / MINI:60）
  - Webhook: stream-webhook で配信状態を submissions に同期（uploading/processing/ready/error）
- 投稿API（DB関数）
  - create_submission_with_cooldown_check の推奨呼出
    - シグネチャ1（推奨・Stream経由）: (uuid, text, battle_format, text DEFAULT NULL)
      - 成功時は stream_video_id を指定し、video_url は NULL を明示
    - シグネチャ2（フォールバック・直リンク）: (uuid, text, text)
  - 1時間投稿制限・シーズン制限を関数内で検証

---

## 5. マッチングの仕様
- 即時マッチング（submission-webhook → find_match_and_create_battle）
  - レート差 ±50 優先 → 不成立なら ±100 で再検索
  - battle_format 一致が必須（MAIN と MINI は混在しない）
- 段階的マッチング（progressive_matchmaking）
  - 投稿から10分経過後に対象化
  - 待機時間に応じて許容差を拡大（0-3h:±100 / 3-12h:±200 / 12-24h:±400 / 24h+:無制限）
  - 48時間の重複対戦防止（同一相手との再戦回避）

詳細は「マッチング・投稿機能仕様書」を参照。

---

## 6. 結果計算の仕様
- レーティング（Elo）
  - 形式別 K: MAIN=64, MINI=32
  - 期待勝率 E はレート差に基づき算出（実装はDB関数側）
  - 変動幅は K×(実勝率−期待勝率)。MINIはMAINの半分の影響度
- シーズンポイント（固定配点 + 連敗デケイ）
  - MAIN: 勝 +32 / 引分 +8 / 負 4→2→0
  - MINI: 勝 +16 / 引分 +4 / 負 2→1→0
  - 負け時の配点は「バトル前の連敗数」に依存。勝ち/引分で連敗はリセット
- 実装参照
  - Kファクター: public.get_k_factor_by_format(enum/text)
  - ポイント更新: public.update_season_points_after_battle(p_battle_id uuid, p_winner_id uuid DEFAULT NULL)

---

## 7. 運用・バリデーション指針
- 形式境界の長さ（60秒）は双方で許可。ユーザー選択に従う
- 形式間のマッチング混在を禁止（必ず battle_format でフィルタ）
- Stream 直アップロードでは maxDurationSeconds を形式に合わせて必ず設定
- PostgREST オーバーロード解決安定化のため、Stream成功時は video_url=NULL を明示

---

## 8. 互換性・移行
- 2025-09-03 移行で MINI の K を 32 に統一（かつ MAIN=64, THEME=20）。
  - マイグレーション: supabase/migrations/20250903_update_kfactor_and_season_points_mini.sql
  - 開発/本番ともに適用済み。enum/text 両オーバーロードで一致
- 旧オーバーロード（4引数 text）は廃止。曖昧性のある呼び出しを回避

---

## 9. QAチェックリスト（抜粋）
- 投稿
  - 選択形式に応じて 30-60/60-120 の長さでないと投稿不可
  - 60秒動画で MAIN/MINI の双方を選択可能である
  - 1時間投稿制限・シーズン制限が効く
- マッチング
  - MAIN と MINI が混在しない
  - 即時: ±50→±100、段階的: 時間帯ごとの許容差
- 結果
  - MINI でおおむね ±16 前後のレート変動（K=32の期待値）
  - MINI のシーズンポイントが勝+8/引+4/負2→1→0 で推移

---

## 10. 変更履歴
- v1.0 (2025-09-03): 初版。MAIN/MINI の形式仕様を統合。K/配点/動画長さ/マッチング分離/アップロード制約/移行情報を明記。
