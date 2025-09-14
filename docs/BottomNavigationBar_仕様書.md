# モバイル Bottom Navigation Bar 仕様書

最終更新: 2025-09-14  
対象ブランチ: develop  
参照必須: `docs/BeatNexus.md`

## 1. 目的
モバイル表示時（主に < md ブレークポイント）において、主要回遊（Home / Ranking / Post / Shop / Profile）へ素早くアクセスできる固定ボトムナビゲーションを提供し、ヘッダー要素の圧迫を軽減しつつ投稿（VS）行動を促進する。ヘッダーのプロフィールアイコンはモバイルで非表示とし、プロフィール関連操作（設定 / ログアウト等）は BottomNav のプロフィールメニューに統合する。

## 2. 対象範囲
- コンポーネント: `src/components/layout/BottomNav.tsx`
- 追加/変更: `src/App.tsx` のレイアウト下部への組み込み、`Header.tsx` モバイルプロフィール削除
- 関連ストア: `authStore` (ユーザー情報), `notificationStore` (未読バッジ表示は現状未実装 / 拡張余地)

## 3. 表示条件
| 条件 | 挙動 |
|------|------|
| ビューポート幅 < `md` | BottomNav 表示、Header のプロフィールアイコン非表示 |
| ビューポート幅 >= `md` | BottomNav 非表示、既存 Header ナビ使用 |
| 未ログイン | Post ボタンタップ → 認証導線（今後拡張予定: AuthModal 呼出）|
| ログイン済み | Profile メニュー有効、Post ボタンで投稿画面 (未決ならルート設計拡張) |

## 4. UI 構成
| 要素 | アイコン/画像 | ラベル | ルート | 備考 |
|------|---------------|--------|--------|------|
| Home | `/images/home.png` | Home | `/` | Active: テキスト強調 + アイコン透過無効 |
| Ranking | `/images/Ranking_icon.png` | Ranking | `/ranking` | ランキングページ |
| Post (中央) | `/images/VS.png` | POST | `/post` (仮) | 追加強調(二重円/グラデーション) / 触覚的主役 CTA |
| Shop | アイコン (`lucide-react` から選定可) | Shop | `/subscription` | ラベルは将来 i18n 化予定 |
| Profile | ユーザーアバター | Profile | (メニュー) | ドロップダウン開閉 |

### 4.1 中央 VS ボタン装飾
- 外側: `bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 p-[2px] rounded-full shadow-lg shadow-purple-500/30`
- 内側: `bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-full`
- 画像: `/images/VS.png`
- サイズ: 64x64px（親コンテナ中央より上に浮かせる `-mt-10`）

### 4.2 バー背景
- クラス例: `fixed bottom-0 inset-x-0 z-40 bg-gradient-to-b from-gray-900/80 via-gray-900/75 to-gray-950/90 backdrop-blur-md border-t border-cyan-500/10`
- 安全領域 (iOS Safari 対応): `pb-safe` (Tailwind プラグインまたは CSS 変数運用) ※ 実装で `pb-2` + 余白確保

## 5. 状態 & ロジック
| 状態 | 型 | 説明 |
|------|----|------|
| `isProfileOpen` | boolean | プロフィールドロップダウン開閉フラグ |
| `userProfile` | `{ id, username, avatar_url, ... } \| null` | Supabase `profiles` テーブルから取得（初回/ユーザー変更時）|

### 5.1 プロフィール取得
```
const { data } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', user.id).single();
```
- エラーは `console.error` ログのみ（UI 非表示）。
- アバターURL優先順位: `userProfile.avatar_url` → `auth.user_metadata.avatar_url` → 既定画像 (`getDefaultAvatarUrl()`).

### 5.2 外側クリックでのメニュー閉鎖
現状: Header 同等の outside click listener 未統合（改善余地）。
提案: `useEffect` + `document.addEventListener('mousedown', handler)` 導入。

## 6. ルーティング/ナビゲーション
- `useNavigate()` で各ボタン押下時に遷移。
- Active 判定: `location.pathname.startsWith(target)` の単純マッチ（現状コードはページによって厳密/部分一致調整可能）。

## 7. i18n 方針
| ラベル | 現状 | 対応予定キー案 |
|--------|------|----------------|
| Home | 英語固定 | `nav.home` |
| Ranking | 英語固定 | `nav.ranking` |
| POST | 英語固定 | `nav.post` |
| Shop | 英語固定 | `nav.shop` |
| Profile | 英語固定 | `nav.profile` |
| Dropdown: Profile | 既存 Header: `hoverCard.profile` | 再利用 |
| Dropdown: My Battles | `hoverCard.myBattles` | 再利用 |
| Dropdown: Settings | `hoverCard.settings` | 再利用 |
| Dropdown: Logout | `hoverCard.logout` | 再利用 |

## 8. アクセシビリティ
| 項目 | 対応 |
|------|------|
| `aria-label` (Post) | 実装済み: `aria-label="Create a post"` |
| フォーカスリング | ブラウザデフォルト + カスタム outline 改善余地 |
| ロール属性 | `nav` ラッパー未設定（改善余地: `<nav aria-label="Primary mobile">`）|
| タップ領域 | ボタン全体 (44px 以上: 中央以外は 40px 程度 → 改善余地あり) |

## 9. セキュリティ/権限制御
| ケース | 現状 | 改善案 |
|--------|------|--------|
| 未ログイン投稿ボタン | そのまま遷移 (エラー/ガード先任せ) | 押下で AuthModal 呼出し |
| プロフィールメニュー | 未ログイン時非表示 (条件 `user`) | Skeleton 表示検討 |

## 10. 既知の制約 / 改善候補
| 分類 | 内容 | 優先度 |
|------|------|--------|
| ドロップダウン | Outside click / ESC 未対応 | 中 |
| i18n | ボタンラベル英語固定 | 中 |
| アニメーション | メニュー開閉フェード無 | 低 |
| アクセシビリティ | `nav` ロール / ランドマーク未設定 | 中 |
| Safe Area | iOS 下部ホームバー領域最適化 (env(safe-area-inset-bottom)) | 中 |
| 通知連携 | 未読数バッジ未実装 | 低 |

## 11. 簡易テストシナリオ
| ID | シナリオ | 手順 | 期待結果 |
|----|----------|------|----------|
| TC01 | 初期表示 | 幅 375px でトップアクセス | BottomNav 表示 / Header プロフィール非表示 |
| TC02 | ルーティング遷移 | Home→Ranking→Shop | Active 状態ハイライト切替 |
| TC03 | プロフィールメニュー表示 | プロフィールアイコンタップ | メニューが表示され項目がクリック可能 |
| TC04 | Post CTA | 中央 VS ボタン押下 | 指定ルートへ遷移 or 仕様未実装なら no error |
| TC05 | ログアウト後 | ログアウト状態を再現 | プロフィールアイコンが消える |
| TC06 | 回転 | 縦→横→縦 | レイアウトが崩れない |

## 12. コンポーネント構造（抜粋イメージ）
```tsx
<div className="fixed bottom-0 ... md:hidden">
  <div className="flex justify-around items-end relative">
    <NavButton to="/" icon={<img src="/images/home.png" />} label="Home" />
    <NavButton to="/ranking" ... />
    <PostButton />  // 中央浮遊CTA
    <NavButton to="/subscription" label="Shop" />
    <ProfileMenu />
  </div>
</div>
```

## 13. スタイルガイド準拠
- グラデーション/彩度は `docs/BeatNexus.md` のダークテーマ/ネオンシアン＋パープル系指針に沿う
- 半透明 + `backdrop-blur` によりガラス調レイヤーを実現

## 14. 変更履歴
| 日付 | 変更 | 担当 |
|------|------|------|
| 2025-09-14 | 初版作成 | AI Assist |
| 2025-09-14 | Battles→Home / 配色改善 / Profile統合 / Headerモバイル削除反映 | AI Assist |

## 15. 今後の追加タスク候補
- i18n キー導入 (`nav.*`) 定義 + 既存 hoverCard キー共通化
- Outside click / ESC 対応 (共通 hook 化 `useOutsideClick`)
- 未読通知バッジ (Ranking 近辺 or Profile アバター角バッジ)
- Post ボタン：未ログイン時 AuthModal 呼出し
- Safe Area 対応: `style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}`
- アクセシビリティ: キーボードタブ順序 / aria-current / role="navigation"

---
以上。
