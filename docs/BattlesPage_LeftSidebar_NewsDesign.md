# BattlesPage 左サイドバーお知らせ＆ガイド設計書 (Supabase継続版)

- 作成日: 2025-10-12
- 作成者: GitHub Copilot
- 参照ドキュメント: `docs/BeatNexus.md`, `docs/お知らせカルーセル実装仕様書.md`, `docs/BattlesPage_FilterSidebar_ImplementationPlan.md`, `.github/copilot-instructions.md`
- 対象画面: `src/pages/BattlesPage.tsx`
- 関連コンポーネント: `src/components/battle/NewsCarousel.tsx`, `src/components/battle/BattleFilters.tsx`, `src/components/ui/ArticleModal.tsx`, `src/hooks/useNews.ts`, `src/components/ads/AdSlot.tsx`

---

## 1. 背景と目的

BattlesPage 上部に表示しているカルーセル（How-to ガイド導線 + ニュース）を、PC 表示時には左サイドバーへ移設し、モバイルでは既存のカルーセル体験を維持する。ユーザーは投票・観戦の導線を保ちつつ、ガイドや最新情報に常時アクセスできるようになる。

既存の Supabase `site_news` テーブルを継続利用し、CMS 移行は行わない。既存コンテンツ管理フローを維持しつつ、レイアウト変更と UX 改善を図る。

---

## 2. 目的・達成指標

| 目的 | 指標 (KPI) |
| --- | --- |
| PC でのニュース到達性向上 | ニュースモーダル開封率 10% 向上 |
| How-to ガイド導線の視認性確保 | ガイドモーダル起動数維持 (リリース前後比較で ±5% 以内) |
| Supabase 運用継続 | CMS コンテンツ登録フローに変化なし |

---

## 3. スコープと非スコープ

### 3.1 スコープ
- BattlesPage の PC レイアウト再設計 (左サイドバーをニュース・ガイド専用領域に変更)
- ニュース一覧表示コンポーネントの新規追加 (`NewsSidebar` 仮称)
- 既存カルーセル (`NewsCarousel`) のモバイル専用化と軽微な UI 調整
- Supabase `useNews` フックの再利用、キャッシュ・エラーハンドリング改善
- ガイド導線の UI 表現調整 (カード化)

### 3.2 非スコープ
- Supabase データモデルの変更 (schema そのまま)
- MicroCMS への移行
- 新規ニュースカテゴリ追加や多言語化拡張 (現状の `language` カラムを踏襲)
- AdSlot 配置の再設計 (必要最小限のみ調整)

---

## 4. 現状整理

### 4.1 UI レイアウト (現行)
- PC: BattlesPage 最上部に幅広カルーセルがあり、その下にフィルターカード + バトル一覧。
- 左サイドバーは未使用（または将来的なフィルター常設想定）。右サイドバーはランキング。
- カルーセル内: 1枚目 How-to ガイド誘導、2枚目広告、3枚目以降ニュース（最大 8 件）。自動スライド・ドット UI。

### 4.2 データ取得
- `useNews` フックが Supabase `site_news` を言語別・公開フラグ付で取得。
- ローディング／エラーハンドリングはフロント側で実施。

### 4.3 課題
1. カルーセルがページ上部に占有し、バトル一覧到達までの距離が遠い。
2. PC ではカルーセルを見逃すケースが多い (スクロール直後に消えてしまう)。
3. ニュース 0 件の際にカルーセルが過剰に空間を占有する。

---

## 5. 要件定義

### 5.1 機能要件
1. **左サイドバー表示 (PC)**: How-to ガイドカード・ニュースリスト・広告枠を縦に配置。スクロール追従 (sticky)。
2. **モバイル表示**: 現行カルーセル UI を維持し、1 つ目のスライドにガイドカード、2 枚目以降にニュース。
3. **ニュースデータ**: Supabase `site_news` テーブルから最新順 + `display_order` に従って取得し、最大 5 件表示。
4. **ニュース閲覧**: クリックで `ArticleModal` を再利用、`link_url` がある場合は新規タブ遷移 (モーダル内で案内)。
5. **ガイド導線**: カードクリックで `useOnboardingStore.setOnboardingModalOpen(true)`。
6. **ローディング/エラー**: サイドバー・カルーセルとも Skeleton もしくは How-to のみ表示でフォールバック。

### 5.2 非機能要件
- レスポンシブ: Tailwind ベースで `lg` ブレークポイント以上はサイドバー。
- パフォーマンス: ニュース取得は初回のみ、依存ユーザ情報が変化しない限り再フェッチしない。
- アクセシビリティ: キーボードナビゲーション対応、ARIA 属性を付与。
- 運用: 既存の Supabase 管理 UI でニュース CRUD 可能。記事作成手順は変更しない。

---

## 6. UI/UX 設計

### 6.1 PC レイアウト
```
┌───────────────┬────────────────────────────┬───────────────┐
│ 左サイドバー (1)   │ メイン (2)                               │ 右サイドバー (3)   │
│ ・ガイドカード      │ ・フィルター                             │ ・ランキング        │
│ ・ニュースリスト    │ ・バトル一覧 + 広告                     │                     │
│ ・広告枠 (任意)     │                                           │                     │
└───────────────┴────────────────────────────┴───────────────┘
```
- (1) を `lg:sticky lg:top-[calc(var(--header-height)+1rem)]` とし、スクロールしても固定。
- ニュースカード: サムネイル 16:9 (存在しない場合はグラデーション背景 + アイコン)。
- ガイドカード: 背景グラデーション、How-to スライド サムネイル、CTA テキスト。

### 6.2 モバイル / タブレット
- 既存カルーセル (`NewsHighlightCarousel`) を継続。
- カルーセル下に簡易ニュースリスト（最新 3 件のタイトルリンク）を追加する案も検討（任意）。
- サイドバー用ニュースリストは `lg:hidden` で非表示。

### 6.3 インタラクション
- ニュースカード hover: サムネイルに 5% ズーム、タイトルカラー強調。
- キーボード操作: Tab でガイド→ニュース→広告の順にフォーカス。
- モーダル（記事閲覧）: 既存の `ArticleModal` を使用。`link_url` がある場合、本文末に「詳しく読む」ボタンで外部遷移。

### 6.4 空 / エラー時 UI
- ニュース 0 件：How-to カードのみ表示し、下部に「新着情報を準備中です」メッセージ。
- 取得エラー：サイドバー上部に警告トースト (非モーダル) + 再試行ボタン。カルーセルは How-to のみ。

---

## 7. コンポーネント構成

| コンポーネント | 役割 | 主な props | 備考 |
| --- | --- | --- | --- |
| `NewsSidebar` (新規) | PC 左サイドバーの全体レイアウト | `className?`, `news`, `loading`, `error`, `onRetry` | `useNews` フックを内部で使用 or 上位から注入 |
| `NewsSidebarCard` (新規) | ニュース単体カード | `newsItem` | `ArticleModal` 呼び出し + `link_url` 対応 |
| `GuideSidebarCard` (新規) | How-to ガイド UI | `onOpenGuide` | 背景画像／テキスト固定 |
| `NewsHighlightCarousel` (既存 `NewsCarousel` 改名) | モバイル用カルーセル | 既存 props を活かす | PC では `hidden` |
| `useNews` (既存強化) | Supabase からニュース取得 | `limit`, `language`, `includeUnpublished` | `cacheKey` に `language` を含める |

※ 実装効率のため、`NewsSidebar` でも既存 `useNews` を再利用する。カルーセルと共有する際はフックから返す `news` を `BattlePage` で取得し、両方に渡す案も可。

---

## 8. データ・状態設計

### 8.1 Supabase `site_news` スキーマ再確認
| フィールド | 用途 | メモ |
| --- | --- | --- |
| `title` | ニュースタイトル | 50 文字程度推奨 |
| `body` | 本文 | モーダル本文・カルーセル説明に使用 |
| `image_url` | サムネイル画像 | 1280x720 推奨 |
| `link_url` | 外部リンク | 任意。存在すれば別タブ遷移案内 |
| `published_at` | 公開日 | 表示順降順 |
| `display_order` | 手動順序 | 昇順で優先表示 |
| `language` | 言語コード | 現在は `en` または `ja` |
| `is_published` | 公開フラグ | `true` のみ取得 |

### 8.2 フック挙動
Pseudo:
```ts
const { news, loading, error, refetch } = useNews({ limit: 8 });
```
- ニュース取得: `display_order` ASC → `published_at` DESC。
- キャッシュ: `useRef` + `sessionStorage` の TTL (6h) を導入し、再訪時のローディング短縮 (任意)。
- 言語: i18n の現在言語 (fallback `en`)。

### 8.3 状態分配案
- `BattlesPage` で一度 `useNews` を呼び、返り値を `NewsSidebar` と `NewsHighlightCarousel` に渡す。
- これによりデータフェッチが 1 回で済み、整合性も保たれる。

---

## 9. 実装計画

| 手順 | 概要 | 詳細 |
| --- | --- | --- |
| 1 | 既存カルーセルのリファクタ | `NewsCarousel` → `NewsHighlightCarousel` に改名し、レスポンシブ表示制御を追加。How-to ボタン文言を調整。|
| 2 | `NewsSidebar` 実装 | How-to カード + ニュースカードリスト + 広告枠 (任意)。`ArticleModal` 呼び出しロジックを実装。|
| 3 | `BattlesPage` レイアウト調整 | `NewsSidebar` を `lg:col-span-1` に配置。モバイルはカルーセル、PC はサイドバーが表示されるよう `hidden` クラスを設定。|
| 4 | フック最適化 | `useNews` の言語判定ロジック／エラーハンドリングをクリーニング。必要ならキャッシュ導入。|
| 5 | テスト & デバッグ | PC/モバイル両方で表示、モーダル、リンク遷移、エラー UI を確認。|
| 6 | 実装ログ | `.cursor/docs/dev-rules/2025-10-12_battles-news-sidebar.mdc` を作成し、変更点とテスト結果を記録。|

---

## 10. 運用フロー

1. **ニュース登録**: Supabase 管理 UI または SQL で `is_published=true` でレコード追加。
2. **表示順調整**: `display_order` を小さい順に設定。
3. **画像アップロード**: 既存の画像ストレージ運用 (S3/Supabase Storage) を継続。CDN URL を `image_url` に入力。
4. **緊急告知**: `display_order=0` を設定するとサイドバー最上部に表示。
5. **エラーモニタリング**: Supabase ログ + フロントの `console.error` (Sentry 連携がある場合は同時通知)。
6. **定期レビュー**: 週次でクリック率・モーダル閲覧数を確認し、コンテンツ入れ替えを検討。

---

## 11. リスクと対策

| リスク | 内容 | 対策 |
| --- | --- | --- |
| レイアウト崩れ | サイドバー幅が狭く、タイトルが折り返し過多になる | `line-clamp-2` と `text-sm` 調整、MediaQuery で余白最適化 |
| ニュース 0 件 | サイドバーが空になる | デフォルトメッセージ表示、How-to カードを残す |
| Supabase 障害 | ニュース取得不可 | `error` ハンドリングで How-to カードのみ表示し、再試行ボタン提示 |
| 多言語切替 | `i18n` 言語変更時にニュース再取得が遅れる | `useEffect` の依存に `i18n.language` を追加し、即時再フェッチ |

---

## 12. テスト計画

| テスト項目 | 期待結果 | 備考 |
| --- | --- | --- |
| PC 表示確認 | 左サイドバーにガイド+ニュースが表示され、スクロールしても固定 | Chrome, Safari |
| モバイル表示確認 | カルーセルが従来通り動作、ニューススライドが存在 | iOS Safari, Android Chrome |
| ニュース 0 件 | サイドバー/カルーセルが How-to のみ表示、エラーなし | Supabase の `is_published=false` で確認 |
| API エラー | 手動で通信失敗させ、フォールバックメッセージと再試行が動作 | devtools ネットワーク off-line |
| 言語切替 | 日本語・英語でニュースが切り替え | `language` カラム要確認 |
| アクセシビリティ | Tab ナビゲーション、スクリーンリーダーで朗読確認 | Lighthouse a11y |

コマンド例:
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm run dev # 手動確認用
```

---

## 13. リリース手順

1. 開発環境ブランチで実装 → PR 作成。
2. レビュー・QA 完了後に `develop` へマージ。
3. `pnpm build` でビルド確認。
4. ステージングデプロイで PC/モバイル確認。
5. 本番デプロイ。
6. `.cursor/docs/dev-rules/2025-10-12_battles-news-sidebar.mdc` を作成し、変更点・テスト結果を記録。
7. デプロイ後 24 時間は Supabase の `site_news` アクセスログや Sentry エラーを監視。

---

## 14. フォローアップ / 将来拡張

- ニュースカテゴリを分けたい場合は `content_type` でフィルタリングできるよう UI 拡張。
- ガイドカードの AB テスト (背景画像・文言) 実施。
- Supabase Edge Functions を利用したキャッシュ整形 API の導入検討。
- 右サイドバーへの情報再配置 (ユーザー情報カード等) は別タスクで検討。

---

## 15. まとめ

- Supabase 運用を維持しつつ、PC では左サイドバー、モバイルではカルーセルを提供するハイブリッド構成。
- 既存 `useNews` フックを共通化することで実装コストを抑え、データ整合性を確保。
- 運用フローは従来通りで、ニュース登録者の学習コストはゼロ。
- テスト・リリース手順、リスク対策を明記し、実装ログの残し方も定義済み。

以上の内容に沿って実装を進めれば、運用負荷を増やさずにニュース導線を改善できる。