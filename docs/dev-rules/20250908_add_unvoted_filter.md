# 2025-09-08 未投票バトルフィルター追加ログ

## 目的
BattlesPage に「未投票のみ」フィルターを追加し、ユーザーが自分がまだ投票していないアクティブバトルを素早く絞り込めるようにする。

## 変更概要
- 状態追加: `showUnvotedOnly` (BattlesPage)
- ロジック: `current_user_voted !== true` のバトルのみ抽出
- UI: BattleFilters にボタン追加（MyBattlesボタンの隣、エメラルド系グラデーション）
- アクティブフィルターサマリーにバッジ追加
- i18n: ja/en に `battleFilters.unvotedOnly`, `battleFilters.unvoted` を追加
- 既存 useMemo の二重閉鎖バグを修正（パッチ作成時に混入）

## テスト観点
1. ログアウト状態では「未投票のみ」ボタン非表示
2. ログイン状態で投票済みバトルがリストから除外される
3. 他フィルター（検索 / MyBattles / Sort）との組み合わせ動作
4. 完了済み(archived/completed) タブ選択時は未投票フィルター非干渉（active list空）
5. ページネーション切替時の維持

## 追加の考慮 (今後)
- パフォーマンス最適化: 投票数が大幅に増える場合はサーバーサイドで未投票クエリを提供するRPC導入を検討
- 未投票件数バッジ表示（例: ボタンにカウント）
- ユーザー設定でデフォルトONにするオプション

## コード参照
- `src/pages/BattlesPage.tsx`
- `src/components/battle/BattleFilters.tsx`
- `src/i18n/locales/ja.json`, `en.json`

## 完了ステータス
DONE
