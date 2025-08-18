# BattleCard 投票済バッジ表示 機能仕様書 (初版)

最終更新: 2025-08-19  
バージョン: v1  
対象環境: 開発 / 本番  
関連既存仕様: `docs/BeatNexus.md`, `docs/投票機能仕様書.md`

---
## 1. 目的 / 背景
ユーザーがバトル一覧 (Battlesページ) を閲覧する際、どのバトルに『既に自分が投票したか』を一目で把握できるようにし、未投票バトルへの誘導性 (投票促進) と状況認知を向上する。まずは **カード上に小さな「投票済」バッジを表示** する最小実装 (MVP) を行い、その後の拡張 (フィルター機能) を見据えた拡張性を確保する。

---
## 2. スコープ
### 含む
| 項目 | 内容 |
|------|------|
| 表示要素 | BattleCard (Simple / Special 両方) の右上 (暫定) に "投票済" / "VOTED" バッジ |
| 言語対応 | i18n (ja / en) |
| データ取得 | 現ユーザーがそのバトルに投票しているかの真偽値 (current_user_voted) |
| プレビュー | 開発確認用: `/dev/battle-card-voted-preview` (投票済 / 未投票 2種類表示) |
| アクセシビリティ | aria-label 付与 (視覚以外で識別可能) |
| パフォーマンス | 既存一覧クエリに LEFT JOIN 1回追加のみ |

### 含まない (今後検討)
| 項目 | 理由 |
|------|------|
| 「投票済のみ」フィルター | 初期段階ではバッジのみで十分。利用状況を観測後に判断 |
| 未投票を優先ソート | 初期要求外。UI過密回避 |
| 通知 / ハイライトアニメーション | 過剰演出回避。ベース行動計測後 |
| モバイル固有最適化 | 汎用Tailwindレイアウトでまず実装 |

---
## 3. 要求一覧 (機能要件)
| ID | 要件 | 優先度 |
|----|------|--------|
| FR-1 | Battle一覧の各カードに現ユーザー投票済ならバッジ表示 | High |
| FR-2 | SimpleBattleCard / SpecialBattleCard 両方対応 | High |
| FR-3 | i18nキー: `battleCard.voted` / `battleCard.votedAria` | High |
| FR-4 | 追加クエリ負荷は O(1 JOIN) に抑制 | High |
| FR-5 | 既存デザインを崩さず視認性を確保 (非侵襲) | High |
| FR-6 | プレビューページで両状態を同時確認可能 | High |
| FR-7 | バッジ表示はアーカイブ済・未アーカイブ双方で機能 | Medium |
| FR-8 | 署名付き/キャッシュ戦略: ユーザー依存なので共有キャッシュ禁止 | Medium |
| FR-9 | 画面リサイズでも位置ズレしない (absolute + inset 使用) | Medium |
| FR-10 | 将来フィルター導入時に current_user_voted を WHERE EXISTS に転用可 | Medium |

---
## 4. 非機能要件
| 項目 | 指標 |
|------|------|
| パフォーマンス | 追加JOINで 50ms 以下 (平均) を目標 (PostgreSQL標準Index) |
| 可読性 | 既存型に optional boolean 追加 (`Battle['current_user_voted']`) |
| テスト容易性 | プレビュー + モックデータで状態再現 |
| 拡張性 | フィルター/ソートへ容易に拡張可能なキー命名 |
| アクセシビリティ | aria-label 提供 + テキスト表示 (色依存不可) |

---
## 5. データ仕様 / 取得方法
### 5.1 追加フィールド
`current_user_voted BOOLEAN NOT NULL DEFAULT false` (レスポンス上の計算列)。DBスキーマ変更は不要。クエリで算出。

### 5.2 推奨クエリ例 (PostgREST / RPC でなくビュー層側)
```sql
SELECT b.*, 
       EXISTS (
         SELECT 1 FROM battle_votes v 
         WHERE v.battle_id = b.id 
           AND v.user_id = auth.uid()
       ) AS current_user_voted
FROM active_battles b
WHERE b.status = 'ACTIVE';
```
アーカイブバトル取得クエリにも同様に適用可能 (必要時)。

### 5.3 インデックス
`battle_votes (battle_id, user_id)` 複合INDEX (既存推奨) を前提とし、`EXISTS` 判定高速化。

---
## 6. フロント側実装方針
1. 型拡張: `Battle` に `current_user_voted?: boolean` を追加 (optional, 未対応APIとの互換維持)
2. バッジ描画: BattleCard コンテナ内 `relative` 、バッジ `absolute top-2 right-2 z-10`
3. カード差分: Simple / Special 共通のラッパ (HOC) 実装 or 各カードに同一スニペット追加 (初期は重複許容 → 後で抽出)
4. 視覚仕様 (初期案):
   - 背景: `bg-emerald-600/80 backdrop-blur-sm`
   - テキスト: `text-xs font-semibold tracking-wide text-white`
   - 枠: `ring-1 ring-emerald-400/50 rounded-md px-2 py-0.5 shadow` 
   - アイコン: Lucide `CheckCircle` (12px) or `Check`
5. i18n: `battleCard.voted` = "VOTED" / "投票済"、`battleCard.votedAria` = "Voted by you" / "あなたはこのバトルに投票済み"
6. SSRキャッシュ: ユーザー固有 → キャッシュキーに user_id を含める or クライアント評価で付与。
   - MVP ではフロント側が取得後に付与 (安全策)。

---
## 7. プレビューページ (`/dev/battle-card-voted-preview`)
| 目的 | 実装前後比較 / デザイントーン確認 / QA |
| 表示内容 | 1. 未投票カード 2. 投票済カード (モック) |
| 実装方法 | `BattleCard` + モック `current_user_voted` 値をラップしてバッジ仮描画 |
| 認証 | 不要 (開発用)。本番にデプロイされても安全 (モック静的)。|

---
## 8. 依存・影響範囲
| 領域 | 影響 |
|------|------|
| DB | 物理変更なし (算出列) |
| API | 選択的にフィールド追加 (後方互換) |
| 型 | `Battle` interface 拡張 |
| UI | Battleカードレイアウト上部余白最小加算 |
| i18n | 2キー追加 |

---
## 9. リスクと対策
| リスク | 対策 |
|--------|------|
| JOIN追加で遅延 | EXISTS + 複合INDEX利用、LIMIT/OFFSET ページング継続 |
| キャッシュ不整合 | MVPはクライアントサイド取得後描画、SSR反映は後続 |
| 旧クエリ未対応 | optional プロパティにより undefined 許容 (表示抑止) |
| 視認性不足 / 過剰 | カラー・サイズを極小に。ABテスト余地確保 |

---
## 10. QAチェックリスト
- [ ] 未投票カード: バッジ非表示
- [ ] 投票済カード: バッジ表示 / 文言正 / アイコン正
- [ ] アーカイブ済カードでも表示ロジック維持
- [ ] i18n切替で文言変化
- [ ] 400%ズームでも重ならない
- [ ] スクリーンリーダーで aria-label 読み上げ

---
## 11. 将来拡張メモ
| フェーズ | 追加案 |
|----------|--------|
| Phase 2 | フィルター: "Voted" / "Not Voted" toggle |
| Phase 3 | 未投票優先ソート option |
| Phase 4 | 投票推奨ハイライト (残り時間 x 未投票) |
| Phase 5 | 投票履歴パネル / 最近投票バトル一覧 |

---
## 12. 実装ステップ (MVP)
1. ドキュメント (本ファイル) 作成 ✅
2. i18nキー追加 (en / ja)
3. 型拡張 `Battle`
4. バッジ描画ロジック追加 (Simple / Special)
5. プレビューページ追加
6. クエリ拡張 (一覧取得API層)
7. QA & 動作確認
8. マージ / リリース

---
## 13. ロールバック戦略
DOM挿入部分 (バッジ JSX) をコメントアウト / 削除するだけで復旧可能。APIは optional なので後方互換保持。DB変更なしのためリスク低。

---
## 14. 承認履歴
| 日付 | 担当 | 内容 |
|------|------|------|
| 2025-08-19 | Draft | 初版作成 |

---
## 15. 付録: 仮バッジデザイン案
```
<div class="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-emerald-400/50 shadow">
  <CheckCircle class="w-3 h-3" /> VOTED
</div>
```
日本語時: "投票済"

---
本仕様は MVP のため軽量。変更要求があれば本ファイル版数を increment し差分を明確化する。
