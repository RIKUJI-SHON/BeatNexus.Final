# ProfilePageV2 Instagram ID 編集機能 実装計画書

- 作成日: 2025-10-04
- 作成者: 開発チーム (GitHub Copilot)
- 参照仕様: `docs/BeatNexus.md`, `docs/ProfilePageV2仕様書.md`
- 対象ページ: `src/pages/ProfilePageV2.tsx`
- 関連Supabaseリソース: `profiles` テーブル, `public.update_user_profile_details` RPC, `avatars` ストレージバケット

---

## 1. 背景と目的

- 参考サイト: https://www.audeobox.com/profiles/5471/
- 現状の ProfilePageV2 ではプロフィールカード内に `instagram_id` が設定されている場合、Instagram へのリンクを表示できるが、プロフィール編集モーダルからは Instagram ID を編集できない。
- ユーザーが自分の Instagram ID をプロフィール設定から登録・更新できるようにし、閲覧者がリンクから Instagram プロフィールへ遷移できる導線を整備する。
- `docs/ProfilePageV2仕様書.md` のセクション 5.1/4 に記載された Instagram 連携要件と整合するよう、入力 UI・RPC・トースト通知・バリデーションを含めた一貫した更新フローを実装する。

---

## 2. スコープ

### 2.1 対象
- フロントエンド: `src/pages/ProfilePageV2.tsx` のプロフィール編集モーダル UI・状態管理・保存ロジック。
- 国際化: `src/i18n/locales/*.json` (`profilePageV2` 名前空間) に Instagram 関連文言を追加。
- バリデーション: ハンドル形式の整形・検証ロジック追加 (フロント側ユーティリティ)。
- サーバーサイド: `update_user_profile_details` RPC のシグネチャ・更新内容拡張 (マイグレーション作成、Supabase dev/prod 適用)。

### 2.2 非対象
- Instagram 以外の SNS ハンドル管理 (将来の複数SNS対応は別タスク)。
- 旧プロフィールページ (`src/pages/ProfilePage.tsx`) のリニューアル。
- ユーザー一覧、ランキング等他画面での Instagram 表示や検索機能追加。

---

## 3. 現状整理とギャップ

| 項目 | 現状 | ギャップ |
| --- | --- | --- |
| プロフィール表示 | `userProfile.instagram_id` が存在するとリンクを表示 (プロフィールカード内) | 編集 UI が未実装で、空欄時の表示制御のみ |
| 編集モーダル | Display Name / Bio のみ編集可能 | Instagram ID 入力欄とプレビューが無い |
| RPC | `update_user_profile_details(p_user_id, p_username, p_bio)` | Instagram ID の入出力に非対応。保存時に更新できない |
| トースト & Analytics | プロフィール更新成功時に共通通知 | Instagram 更新を含めた追加トーストは不要だがエラーハンドリングで Instagram 特有の文言を検討 |
| 型定義 | `UserProfile` に `instagram_id` が含まれる | 編集用 state / payload に未反映 |
| バリデーション | ユーザー名・Bio の簡易チェックのみ | Instagram ハンドル特有の制約が未定義 |

---

## 4. 要件整理

1. プロフィール編集モーダルに Instagram ID 入力欄を追加し、保存時に Supabase を通じて `profiles.instagram_id` を更新できること。
2. 入力フォームでは複数フォーマット (例: `username`, `@username`, `https://instagram.com/username`) を許容し、保存前にハンドル部 (`username`) に正規化する。
3. 不正形式や過剰な長さ (推奨: 最大 30 文字) の場合は保存を禁止し、UI 上でエラー表示する。
4. 保存完了後はプロフィール画面に即時反映し、Instagram ボタンから `https://instagram.com/<normalized>` に遷移できること。
5. `profilePageV2` 名前空間に新規翻訳キー (ラベル、プレースホルダ、バリデーションメッセージ) を追加する。
6. `update_user_profile_details` RPC の戻り値および引数拡張により、`instagram_id` も保存対象とする。既存クライアント (旧プロフィールページなど) への影響を吸収する。
7. 実装完了後は `.cursor/docs/dev-rules/` にログを残す (別タスクで実装時に対応)。

---

## 5. 詳細実装ステップ

### 5.1 フロントエンド (ProfilePageV2.tsx)
1. **状態追加**: `const [editInstagramId, setEditInstagramId] = useState('');` を導入。`fetchUserProfile` 成功時に初期値を設定。
2. **入力欄 UI**: 編集モーダル内に Instagram セクションを追加。
   - ラベル + 説明テキスト。
   - 例: `placeholder="@beatboxer"`。
   - 入力時に `setEditInstagramId` を更新。
3. **正規化ユーティリティ**: 保存前に以下の変換を行う関数を追加。
   - `trim()`
   - 先頭の `https://instagram.com/` や `http://instagram.com/`, `@` を除去。
   - 間に `/` が含まれる場合は末尾セグメントのみ取得。
4. **バリデーション**:
   - 許容文字: 英数字、ピリオド、アンダースコア。
   - 長さ: 0〜30 文字。
   - 不正時はローカルエラーステートを設定し、`Input` に `error` スタイルあるいは補助テキストを表示。
5. **プレビュー表示**: モーダル内で入力に応じたリンクプレビュー (`https://instagram.com/<handle>`) を表示するオプション (任意)。
6. **保存処理更新**:
   - `handleSaveProfile` 内で正規化後のハンドルを RPC へ渡す。
   - RPC 呼び出しパラメータを `{ p_user_id, p_username, p_bio, p_instagram_id }` に更新。
   - 成功時、`setUserProfile` へ返却された最新プロフィールを適用。
7. **UI 表示側微調整**:
   - プロフィールカードのリンク生成も `normalizeInstagramHandle` を利用し、冪等性を保持。
   - Instagram が空の場合の UI (現在の `null` ケース) を維持。

### 5.2 国際化
1. `profilePageV2.editModal.instagramLabel`
2. `profilePageV2.editModal.instagramPlaceholder`
3. `profilePageV2.editModal.instagramDescription`
4. `profilePageV2.editModal.instagramError.invalidFormat`
5. `profilePageV2.editModal.instagramError.tooLong`
6. 成功トーストは既存キーを流用するため追加不要。必要に応じて `toast.instagramRemoved` 等を検討 (任意)。

### 5.3 RPC・マイグレーション
1. **マイグレーションファイル作成**: `supabase/migrations/20251004120000_update_user_profile_details_add_instagram.sql` (仮) を追加。
2. 内容:
   - `CREATE OR REPLACE FUNCTION public.update_user_profile_details(p_user_id uuid, p_username text, p_bio text, p_instagram_id text)` に更新。
   - `profiles` テーブルの `instagram_id` カラムを `LOWER(TRIM(...))` といった軽い正規化で更新 (必要に応じて `regexp_replace`)。
   - NULL 許容。空文字は `NULL` に変換。
   - 戻り値 JSON は既存構造を踏襲し、`profile` に最新行を返す。
3. **ロール権限**: 既存 ACL を再付与 (`GRANT ALL ON FUNCTION ... TO anon/authenticated/service_role`)。
4. **開発環境適用**: dev プロジェクト (`wdttluticnlqzmqmfvgt`) で適用→テスト→本番 (`qgqcjtjxaoplhxurbpis`) 適用。

### 5.4 バリデーション共通化 (オプション)
- 再利用性を高めるため、`src/utils/instagram.ts` (新規) に `normalizeInstagramHandle` / `isValidInstagramHandle` を定義し、将来的な他コンポーネントからも使用可能にする。

---

## 6. テスト計画

1. **型・静的解析**: `pnpm typecheck`, `pnpm lint`。
2. **ユニットテスト (任意)**:
   - `normalizeInstagramHandle` / `isValidInstagramHandle` のユーティリティテストを `vitest` で作成。
3. **手動確認**:
   - Instagram 未設定 → 入力 → 保存 → プロフィールにリンク表示。
   - `@handle`, フル URL, 空白入力の正規化確認。
   - 不正文字 (例: `user!name`) 入力時にエラーが表示され保存できない。
   - フィールドを空にして保存した場合、プロフィールからリンクが消える。
   - 多言語 (少なくとも日本語/英語) でラベル表示が正しい。
4. **Supabase 検証**:
   - RPC 直接呼び出し (`SELECT update_user_profile_details(...)`) で JSON 応答を確認。
   - 開発環境で保存後、`profiles.instagram_id` の値が期待通りであることを Supabase SQL Editor または CLI 経由で確認。

---

## 7. リスクと対策

| リスク | 概要 | 対策 |
| --- | --- | --- |
| 既存クライアント互換性 | 旧プロフィールページや他の RPC 呼び出しが新シグネチャに未対応 | 旧ページの呼び出し箇所を検索し、同時に引数追加 (デフォルトで `null`) を行う。テスト前に該当箇所を洗い出す |
| 無効なハンドル登録 | ユーザーがURLや特殊文字を入力 | 正規化 & バリデーションをフロント側で実施。バックエンドも `regexp` で二重検証を可能にする (オプション) |
| 文字列長超過 | 30文字制限を越えるハンドル | 保存前チェック + RPC 内でも `char_length` チェックを追加しエラー返却 |
| 多言語未整備 | 新規 i18n キー未追加の言語で Fallback が効く | `en`, `ja` を最優先で追加し、他言語は TODO コメント付きで英語Fallback。翻訳未対応は計画書で明記 |
| Supabase 権限漏れ | RPC 更新後に権限を再付与し忘れる | マイグレーションに `GRANT` を含め、CI や `supabase-db-lint` 実行で検知 |

---

## 8. フォローアップ・運用

- 実装完了後、`.cursor/docs/dev-rules/` に `2025-10-xx_profile-page-instagram.mdc` を作成し、手順・動作確認ログを記録。
- プロダクション反映前に、A/B でサンプルユーザーのプロフィール編集を確認。
- 将来的に複数SNSを追加する場合は、本計画で作成するユーティリティを拡張し、フォームを `useFieldArray` などに再構成する。

---

## 9. タイムライン (目安)

| フェーズ | 期間 | 内容 |
| --- | --- | --- |
| 設計レビュー | 0.5日 | 本計画書レビュー、追加要件確認 |
| フロント実装 | 1.0日 | モーダルUI拡張、ユーティリティ、i18n |
| バックエンド更新 | 0.5日 | RPC マイグレーション作成 & 適用 |
| テスト & QA | 0.5日 | ユニット・手動テスト、デバイス確認 |
| リリース準備 | 0.5日 | マイグレーション本番適用、実装ログ記入 |

---

## 10. 未決事項 / 確認事項

1. 他ページ (旧プロフィール等) で Instagram 編集が必要か要確認。
2. トースト文言の追加要件 (Instagram 更新時に個別通知が必要か) をプロダクトオーナーへ確認。
3. Instagram 以外の SNS も同モーダルで管理する構想があるかどうかを UX チームへヒアリング。
