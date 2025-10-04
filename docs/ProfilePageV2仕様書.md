# ProfilePageV2 仕様書

## 1. 概要
- 本仕様書は `src/pages/ProfilePageV2.tsx` に実装されている新プロフィールページの振る舞いを定義する。
- 対象ユーザーのプロフィール情報、統計、バトル履歴、獲得バッジを表示し、閲覧ユーザー本人の場合はプロフィール編集を許可する。
- 多言語対応（日本語 / 英語）を行い、翻訳キーは `profilePageV2` 名前空間に集約している。

## 2. ルーティング
- ルート設定は `src/App.tsx` で管理。
  - `/profile` : 認証済みユーザー本人のプロフィールを表示。
  - `/profile/:userId` : 任意ユーザーのプロフィールを表示。
  - 旧プロフィール画面は `/old-profile` 系パスに退避。既存リンクの参照先は自動的にV2へ切り替わる。

## 3. ユーザー判定ロジック
- URL パラメータ `userId` と認証ストア `authUser` を比較し、以下の通り判定。
  - `isOwnProfile = !routeUserId || authUser?.id === routeUserId`。
  - 本人の場合のみ「プロフィールを編集」ボタンや編集モーダルの操作が可能。

## 4. データソース
| 区分 | 取得先 | 備考 |
| --- | --- | --- |
| プロフィール情報 | Supabase `profiles` テーブル | `id`, `username`, `avatar_url`, `bio`, `instagram_id`, `created_at` 等 |
| アクティブバトル | `useBattleStore().fetchActiveBattles()` | contestant ID を元にユーザー紐付け |
| アーカイブバトル | `useBattleStore().fetchArchivedBattles()` | `ArchivedBattleCard` で表示 |
| バッジ | Supabase `user_rewards` → `rewards` | `reward.name`, `reward.image_url` をマッピング |
| 翻訳 | `src/i18n/locales/*.json` | `profilePageV2` 名前空間 |

## 5. UI レイアウト
### 5.1 トップセクション（2カラム）
- **左カラム (固定 400px)**
  - 円形アバター（`getDefaultAvatarUrl()` フォールバック）。
  - ユーザー名とハンドル（`@username`）。
  - 登録日: `format(created_at, 'MMMM d, yyyy')`。
  - Instagram 連携: `instagram_id` がある場合のみリンクを表示。
  - 編集ボタン: 本人のみ表示。クリックでモーダルを開く。
- **右カラム**
  - Bio カード: 未設定時は *No bio yet* の翻訳文。
  - 統計グリッド（2x2）: 勝利数 / 現在連勝 / 最高連勝 / 投稿数。
    - 表示値は `userStats` ステート。
    - `plays` は過去のバトル数で算出（現状アクティブ数は含めず）。

### 5.2 メインセクション
- レイアウト: `lg:grid-cols-[2fr_1fr]`。
- **左カラム: 過去のバトル**
  - アクティブ + アーカイブバトルを合算した配列を表示。
  - デフォルト表示件数は 7 件。`Load More` ボタンで全件表示。
  - バトルカードは `BattleCard` / `ArchivedBattleCard` を動的に選択。
  - バトルデータ取得中はローディングスピナーを表示。
- **右カラム: Achievements（獲得バッジ）**
  - 2 カラムグリッド。
  - バッジの名称・レアリティ（仮値: `COMMON`）を表示。
  - バッジ未取得時はプレースホルダーを表示。

## 6. ユーザー統計の算出
- 対象: アーカイブ済みバトルのみ。
- `wins` : `winner_id === displayedUserId` の件数。
- `plays` : アーカイブバトル総数。
- 連勝計算:
  - `created_at` 降順で走査し、勝利が続く限りカウント。
  - `highestKillstreak`: 最大連勝数。
  - `currentKillstreak`: 最新連勝数（直近敗北で 0 へリセット）。

## 7. プロフィール編集機能
- 編集ボタン押下でモーダルを表示。
- モーダル構成:
  - アバター画像（縮小表示）と `Change Photo` ボタン。
  - Display Name / Bio のフォーム。
  - フッターに Cancel / Save Changes ボタン。
- 保存処理:
  - `update_user_profile_details` RPC を呼び出し、`username` と `bio` を更新。
  - 成功時: プロフィール情報を再設定、トースト表示、Analytics イベント `profileEdit` を送信。
  - 失敗時: トーストにエラーメッセージを表示。

## 8. アバター編集フロー
1. `Change Photo` ボタン押下で `<input type="file">` を生成。
2. 5MB 超過の場合はエラートースト。許容形式: JPG / PNG / GIF。
3. 選択画像は `PhotoEditorModal` で編集。
   - モーダル内で回転・拡大・ドラッグによる調整が可能（別コンポーネント実装参照）。
4. 保存後、Supabase Storage `avatars` バケットへアップロード。
   - ファイル名: `${userId}/${timestamp}.${ext}`。
   - `update_user_avatar` RPC でプロフィールの `avatar_url` を更新。
5. 成功時は `toast.success` としてフィードバック。

## 9. 翻訳キー
- 名前空間: `profilePageV2`。
- 代表キー:
  - 共通: `userNotFound`, `backToHome`, `memberSince`, `noBio`, `editProfile`。
  - 統計: `stats.wins`, `stats.currentWinStreak`, `stats.highestWinStreak`, `stats.plays`。
  - セクション: `sections.pastBattles`, `sections.achievements`。
  - バトル: `battles.noBattles`, `battles.loadMore`。
  - バッジ: `badges.noBadges`。
  - モーダル: `editModal.*`。
  - トースト: `toast.success`, `toast.error`, `toast.avatarUpdated`, `toast.profileUpdated`, `toast.uploadFailed`, `toast.updateFailed`, `toast.fileSizeError`。

## 10. ローディング・エラー表示
- プロフィール未読込時: 全画面ローダー（背景 #0a0a0a）。
- プロフィール未取得時: 全画面メッセージ + 「ホームに戻る」ボタン。
- バトル取得中: セクション内でローダー表示。
- トースト通知: `toastStore` を使用。

## 11. 依存モジュール
- 状態管理: `useAuthStore`, `useBattleStore`, `toastStore`。
- コンポーネント: `BattleCard`, `ArchivedBattleCard`, `AvatarUpload`, `PhotoEditorModal`, `Input`, `Textarea`, `Button`。
- 外部ライブラリ: `date-fns`（日付表示）、`lucide-react`（アイコン）、`react-i18next`（翻訳）。
- 分析: `trackBeatNexusEvents.profileEdit`。

## 12. 制約・備考
- 連勝計算は暫定実装（アクティブバトルは含まず）。
- 投稿数 (`plays`) はアーカイブバトル数と同値。要件変更時は見直しが必要。
- Supabase の RPC/Storage 名称は固定 (`update_user_avatar`, `update_user_profile_details`, `avatars` バケット)。変更時は同時更新が必要。
- Instagram ID はユーザー入力値をそのままリンクに使用するため、バリデーションは別途検討。

## 13. 今後の拡張候補
- 連勝計算ロジックの高度化（引き分け考慮など）。
- バッジのレアリティ表示を実データに合わせて更新。
- プロフィール情報に追加フィールド（ロール、外部リンクなど）を拡充。
- モバイル表示時の統計カード並び最適化。

---
- 作成日: 2025-01-25
- 作成者: GitHub Copilot
