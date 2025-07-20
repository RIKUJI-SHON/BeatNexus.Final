# BeatNexus デザイン仕様書

*Version: 1.0.0*  
*作成日: 2025年7月20日*  
*対象: React + TypeScript + Tailwind CSS プロジェクト*

---

## 📋 概要

このドキュメントは、BeatNexus プロジェクトのデザインシステムと仕様を定義したものです。
新しいページやコンポーネントを作成する際は、この仕様書を参考にしてデザインの一貫性を保ってください。

---

## 🎨 カラーパレット

### メインカラー

#### プライマリカラー（Blue系）
- **Primary Blue**: `#3B82F6` (blue-500) - メインアクション、プレイヤーA
- **Primary Blue Dark**: `#1D4ED8` (blue-700) - ホバー状態
- **Primary Blue Light**: `#60A5FA` (blue-400) - アクセント

#### セカンダリカラー（Purple系）  
- **Purple**: `#8B5CF6` (purple-500) - セカンダリアクション
- **Purple Dark**: `#7C3AED` (purple-600) - ホバー状態

#### アクセントカラー（Cyan系）
- **Cyan**: `#06B6D4` (cyan-500) - テーマカラー、フォーカス
- **Pink**: `#EC4899` (pink-500) - プレイヤーB、特別な要素

### 状態カラー

#### 成功・勝利
- **Green**: `#10B981` (emerald-500) - 成功状態、勝利
- **Green Light**: `#34D399` (emerald-400) - ハイライト

#### 警告
- **Yellow**: `#F59E0B` (yellow-500) - 警告、ランキング
- **Orange**: `#F97316` (orange-500) - 中間状態

#### 危険・失敗
- **Red**: `#EF4444` (red-500) - エラー、敗北
- **Red Dark**: `#DC2626` (red-600) - 強い警告

### グレースケール

#### ダークテーマ（メイン）
- **Background**: `#0F172A` (slate-900) - メイン背景
- **Surface**: `#1E293B` (slate-800) - カード背景
- **Border**: `#334155` (slate-700) - ボーダー
- **Text Primary**: `#F8FAFC` (slate-50) - メインテキスト
- **Text Secondary**: `#CBD5E1` (slate-300) - セカンダリテキスト
- **Text Muted**: `#64748B` (slate-500) - 無効テキスト

### グラデーション

#### メイングラデーション
```css
/* オンボーディング・特別な要素 */
background: linear-gradient(137deg, rgb(255, 0, 179) 0%, rgba(0,212,255,1) 100%);

/* プライマリボタン */
background: linear-gradient(135deg, #3B82F6, #8B5CF6);

/* 宇宙テーマボタン */
background: linear-gradient(45deg, #0f0f2d, #1a1a3a);

/* グロウエフェクト */
background: radial-gradient(circle farthest-corner at 10% 20%, rgba(255,94,247,1) 17.8%, rgba(2,245,255,1) 100.2%);
```

---

## 🔤 タイポグラフィ

### フォントファミリー
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### フォントサイズとウェイト

#### ヘッダー
- **H1**: `text-4xl font-bold` (36px, 900)
- **H2**: `text-3xl font-bold` (30px, 700)
- **H3**: `text-2xl font-semibold` (24px, 600)
- **H4**: `text-xl font-semibold` (20px, 600)

#### ボディテキスト
- **Large**: `text-lg` (18px) - 重要な説明文
- **Base**: `text-base` (16px) - 標準テキスト
- **Small**: `text-sm` (14px) - 補助テキスト
- **Extra Small**: `text-xs` (12px) - キャプション、ラベル

#### 特殊テキスト
- **ボタンテキスト**: `font-medium` (500) - 中程度の太さ
- **ナビゲーション**: `font-semibold` (600) - セミボールド

### テキストエフェクト

#### グローエフェクト
```css
text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
```

#### グラデーションテキスト
```css
background: linear-gradient(135deg, #06b6d4, #8b5cf6);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

---

## 🧱 レイアウトシステム

### コンテナ

#### 標準コンテナ
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
```

#### 幅バリエーション
- **Full Width**: `.container-full` - 制限なし
- **Wide**: `.container-wide` - 1440px (90rem)
- **Ultra Wide**: `.container-ultra-wide` - 1920px (120rem)

### グリッドシステム

#### レスポンシブブレークポイント
- **Mobile**: `< 768px`
- **Tablet**: `768px - 1024px`
- **Desktop**: `> 1024px`

#### 一般的なレイアウト
```tsx
// メイン + サイドバー
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <main className="lg:col-span-3">
    {/* メインコンテンツ */}
  </main>
  <aside className="lg:col-span-1">
    {/* サイドバー */}
  </aside>
</div>
```

### スペーシング

#### 標準スペーシング
- **Extra Small**: `gap-2` (8px)
- **Small**: `gap-4` (16px)
- **Medium**: `gap-6` (24px)
- **Large**: `gap-8` (32px)
- **Extra Large**: `gap-12` (48px)

---

## 🎯 コンポーネント仕様

### ボタン

#### プライマリボタン（Button.tsx）
```tsx
<Button variant="primary" size="md">
  アクション
</Button>
```

**バリエーション:**
- `primary` - 青色グラデーション
- `secondary` - 紫色
- `outline` - アウトライン
- `ghost` - 透明背景
- `danger` - 赤色

**サイズ:**
- `sm` - 小さい（padding: 8px 12px）
- `md` - 標準（padding: 12px 16px）
- `lg` - 大きい（padding: 16px 24px）

#### 特殊ボタン

**3Dボタン（Button3D.tsx）**
```tsx
<Button3D variant="primary">
  3D アクション
</Button3D>
```

**グローボタン（GlowButton.tsx）**
```tsx
<GlowButton>
  グロー エフェクト
</GlowButton>
```

### カード

#### 基本カード（Card.tsx）
```tsx
<Card className="bg-slate-800 border border-slate-700">
  <CardHeader>
    <CardTitle>タイトル</CardTitle>
  </CardHeader>
  <CardContent>
    <p>コンテンツ</p>
  </CardContent>
</Card>
```

#### バトルカード（特殊デザイン）
```css
.battle-card {
  background: linear-gradient(137deg, rgb(255, 0, 179) 0%, rgba(0,212,255,1) 100%);
  border-radius: 30px;
  filter: drop-shadow(0px 0px 30px rgba(209, 38, 197, 0.5));
}
```

#### シンプルバトルカード
```css
.battle-card-simple {
  background-color: rgb(3 7 18);
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
```

### フォーム要素

#### インプット（Input.tsx）
```tsx
<Input 
  className="bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 focus:ring-cyan-500"
  type="text"
  placeholder="入力してください"
/>
```

#### テキストエリア（Textarea.tsx）
```tsx
<Textarea 
  className="bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500"
  placeholder="メッセージを入力"
/>
```

### バッジ

#### バッジ（Badge.tsx）
```tsx
<Badge variant="success" size="md">
  成功
</Badge>
```

**バリエーション:**
- `default` - グレー
- `success` - 緑色
- `warning` - 黄色
- `danger` - 赤色
- `info` - 青色

---

## ✨ アニメーション・エフェクト

### 基本アニメーション

#### フェードイン
```css
@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fadeIn 0.2s ease-in-out; }
```

#### フロート（浮遊）
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
.animate-float { animation: float 6s ease-in-out infinite; }
```

#### ブロブ（変形）
```css
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
.animate-blob { animation: blob 7s infinite; }
```

### ホバーエフェクト

#### 標準ホバー
```css
.hover-lift {
  transition: transform 0.3s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
}
```

#### グローホバー
```css
.hover-glow:hover {
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
}
```

### 特殊エフェクト

#### パーティクルエフェクト（宇宙テーマ）
```css
.space-button::before {
  background: radial-gradient(
    1px 1px at 10% 15%, rgba(255, 255, 255, 0.95), rgba(0, 0, 0, 0)
  );
  animation: moveParticles1 20s linear infinite;
}
```

#### グラデーションボーダー
```css
.gradient-border {
  background: linear-gradient(90deg, #00c6ff, #845ec2, #ff6f91, #00c6ff);
  background-size: 400% 400%;
  animation: gradientBorder 20s ease-in-out infinite;
}
```

---

## 🎮 特殊コンポーネント

### 投票ボタン

#### プレイヤーA（青）
```css
.vote-btn-player-a {
  --primary: 59, 130, 246;
  --secondary: 30, 64, 175;
  outline: 8px solid rgb(var(--primary), .5);
}
```

#### プレイヤーB（ピンク）
```css
.vote-btn-player-b {
  --primary: 255, 90, 120;
  --secondary: 150, 50, 60;
  outline: 8px solid rgb(var(--primary), .5);
}
```

### ランキング表示

#### トップ3表彰台（TopThreePodium.tsx）
- **1位**: 金色グラデーション + 王冠アイコン
- **2位**: 銀色グラデーション + メダルアイコン  
- **3位**: 銅色グラデーション + アワードアイコン

#### ランクカラー
```typescript
// ランク色の定義（rankUtils.ts）
const rankColors = {
  rainbow: 'bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500',
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-500'
};

// 投票数カラー（ランキングページ）
const voteCountColors = {
  high: 'text-red-400',     // 50以上
  good: 'text-green-400',   // 25以上
  medium: 'text-yellow-400', // 10以上
  low: 'text-blue-400',     // 5以上
  minimal: 'text-slate-300' // 5未満
};
```

---

## 📱 レスポンシブデザイン

### ブレークポイント

```css
/* Mobile First */
.component {
  /* Mobile styles */
}

@media (min-width: 768px) {
  .component {
    /* Tablet styles */
  }
}

@media (min-width: 1024px) {
  .component {
    /* Desktop styles */
  }
}
```

### コンテナパディング

```css
/* Mobile */
padding: 1rem;

/* Tablet */
@media (min-width: 768px) {
  padding: 1.5rem;
}

/* Desktop */
@media (min-width: 1024px) {
  padding: 2rem;
}
```

---

## 🎭 ヘッダー・ナビゲーション

### ヘッダーレイアウト
- **ロゴ**: 左端配置、グローエフェクト
- **ナビゲーション**: 中央配置（デスクトップ）、ハンバーガーメニュー（モバイル）
- **ユーザーアクション**: 右端配置（通知、プロフィール）

### ナビゲーションスタイル
```css
.nav-link {
  color: #CBD5E1;
  transition: color 0.3s ease;
}
.nav-link:hover {
  color: #06B6D4;
}
.nav-link.active {
  color: #06B6D4;
  font-weight: 600;
}
```

---

## 🗂️ アイコンシステム

### 使用アイコンライブラリ
- **Lucide React** - メインアイコンライブラリ

### 主要アイコン
- **ホーム**: `Home`
- **バトル**: `Swords`, `Mic`
- **ランキング**: `Trophy`, `Crown`
- **ユーザー**: `User`, `Users`
- **設定**: `Settings`
- **通知**: `Bell`

### アイコンサイズ
- **Small**: `h-4 w-4` (16px)
- **Medium**: `h-5 w-5` (20px)
- **Large**: `h-6 w-6` (24px)
- **Extra Large**: `h-8 w-8` (32px)

---

## 🌐 多言語対応

### サポート言語
- **日本語** (ja) - メイン言語
- **英語** (en) - セカンダリ言語

### 翻訳キー命名規則
```typescript
// 階層構造
"common.home" // 共通項目
"auth.login" // 認証関連
"battle.submit" // バトル関連
"profile.edit" // プロフィール関連
```

---

## ♿ アクセシビリティ

### フォーカス表示
```css
.focus-visible:focus {
  outline: 2px solid #06b6d4;
  outline-offset: 2px;
}
```

### スクリーンリーダー対応
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 高コントラスト対応
```css
@media (prefers-contrast: high) {
  .text-gray-400 { color: #000; }
  .bg-gray-800 { background-color: #fff; color: #000; }
}
```

---

## 🎨 ダークテーマ仕様

### 背景色階層
```css
/* レベル1: メイン背景 */
background-color: #0F172A; /* slate-900 */

/* レベル2: カード・パネル */
background-color: #1E293B; /* slate-800 */

/* レベル3: インタラクティブ要素 */
background-color: #334155; /* slate-700 */
```

### テキストコントラスト
```css
/* プライマリテキスト */
color: #F8FAFC; /* slate-50 */

/* セカンダリテキスト */
color: #CBD5E1; /* slate-300 */

/* 無効・説明テキスト */
color: #64748B; /* slate-500 */
```

---

## 📋 開発ガイドライン

### CSS/Tailwind使用ルール

1. **Tailwind優先**: 可能な限りTailwindクラスを使用
2. **カスタムCSS**: 特殊エフェクトや複雑なアニメーションのみ
3. **レスポンシブ**: モバイルファーストで記述
4. **一貫性**: 既存のデザインパターンを踏襲

### コンポーネント作成指針

1. **再利用性**: 汎用的に使えるよう設計
2. **Props型定義**: TypeScriptで厳密に型定義
3. **variant/size**: バリエーションとサイズオプション提供
4. **アクセシビリティ**: ARIA属性とキーボード操作に配慮

### ファイル命名規則

```
src/
├── components/
│   ├── ui/           # 汎用UIコンポーネント
│   ├── layout/       # レイアウトコンポーネント
│   ├── auth/         # 認証関連
│   ├── battle/       # バトル関連
│   └── profile/      # プロフィール関連
├── pages/            # ページコンポーネント
├── hooks/            # カスタムフック
├── utils/            # ユーティリティ関数
└── types/            # 型定義
```

---

## 🔧 実装サンプル

### 典型的なページレイアウト

```tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const SamplePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* ヒーローセクション */}
      <section className="relative py-16 md:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-center text-white mb-6">
            ページタイトル
          </h1>
          <p className="text-lg text-slate-300 text-center max-w-2xl mx-auto">
            説明文がここに入ります
          </p>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインエリア */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-800 border border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">セクションタイトル</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">コンテンツ内容</p>
                <div className="mt-4">
                  <Button variant="primary" size="md">
                    アクション
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* サイドバー */}
          <aside className="space-y-6">
            <Card className="bg-slate-800 border border-slate-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  サイドバーコンテンツ
                </h3>
                <p className="text-slate-300 text-sm">
                  サイドバーの内容がここに入ります
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default SamplePage;
```

---

## 📚 参考リンク

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Lucide React Icons](https://lucide.dev/)
- [React Hook Form](https://react-hook-form.com/)
- [Framer Motion](https://www.framer.com/motion/) (将来的なアニメーション拡張用)

---

## 🔄 更新履歴

- **v1.0.0** (2025/07/20) - 初期版作成、基本デザインシステム定義

---

*このドキュメントは、BeatNexus プロジェクトの成長に合わせて継続的に更新されます。*
