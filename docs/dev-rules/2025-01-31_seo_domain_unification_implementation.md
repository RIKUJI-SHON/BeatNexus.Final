# SEO重複ドメイン問題解決実装ログ

## 実装日時
2025-01-31

## 問題の概要
VercelのプレビューURL（beatnexus.vercel.app）と公式ドメイン（beatnexus.app）がGoogleによって別々のサイトとして認識され、以下の問題が発生：

1. **重複コンテンツ問題**: SEOペナルティのリスク
2. **検索結果の分散**: ドメインオーソリティの分散
3. **不整合なURL**: 各所で異なるドメインを使用

## 実装された解決策

### 1. index.htmlメタタグの統一
- **変更前**: OGP・Twitter Cardで`beatnexus.vercel.app`を使用
- **変更後**: 全て`beatnexus.app`に統一
- **対象ファイル**: `index.html`

### 2. robots.txt サイトマップURL修正
- **変更前**: `Sitemap: https://beatnexus.vercel.app/sitemap.xml`
- **変更後**: `Sitemap: https://beatnexus.app/sitemap.xml`
- **対象ファイル**: `public/robots.txt`

### 3. Vercelリダイレクト設定追加
```json
"redirects": [
  {
    "source": "/(.*)",
    "has": [
      {
        "type": "host",
        "value": "beatnexus.vercel.app"
      }
    ],
    "destination": "https://beatnexus.app/$1",
    "permanent": true
  }
]
```
- **効果**: VercelプレビューURLへのアクセスを永久的に公式ドメインにリダイレクト

### 4. sitemap.xml作成
- **新規作成**: `public/sitemap.xml`
- **内容**: 主要ページの多言語対応サイトマップ
- **目的**: Googleクローラーの適切なインデックス

### 5. SEO統一設定システムの実装

#### 新規ファイル: `src/utils/seoConfig.ts`
- 全SEO設定を統一管理
- ドメイン検出・正規化機能
- OGP画像URL生成機能

#### 主要機能:
```typescript
// 統一設定
export const SEO_CONFIG = {
  CANONICAL_DOMAIN: 'https://beatnexus.app',
  VERCEL_DOMAIN: 'https://beatnexus.vercel.app',
  // ...その他設定
}

// 正規URL生成
export function getCanonicalUrl(path: string = '/'): string

// OGP画像URL生成
export function getOgImageUrl(imagePath?: string): string
```

### 6. SEOフック（useSEO.ts）の改良
- **自動canonical URL設定**: 常に公式ドメインを使用
- **自動OG:URL設定**: 動的に公式ドメインでOG URLを設定
- **自動Twitter:URL設定**: 動的に公式ドメインでTwitter URLを設定

### 7. ページ別SEO設定の最適化
- **HomePage.tsx**: 統一設定を使用するよう修正
- **HomepageTestPage.tsx**: 統一設定を使用するよう修正

### 8. Edge Function URL修正
- **OGP生成関数**: `beat-nexus-heatbeat-test.vercel.app` → `beatnexus.app`
- **対象ファイル**: 
  - `supabase/functions/ogp-battle-card/index.ts`
  - `temp_ogp_update/ogp-battle-card-updated.ts`

## 実装効果

### SEO改善
1. **重複コンテンツ解消**: Canonical URLで正規ページを明示
2. **統一ドメイン**: 全てのメタタグで公式ドメインを使用
3. **永久リダイレクト**: 301リダイレクトでSEO評価を統合
4. **適切なサイトマップ**: 検索エンジンの効率的なクロール

### 技術的改善
1. **統一設定システム**: SEO設定の一元管理
2. **自動URL正規化**: 手動設定ミスの防止
3. **動的メタタグ**: ページ毎の適切なSEO設定

### ユーザビリティ改善
1. **一貫したURL**: どこからアクセスしても公式ドメインに統一
2. **適切なSNS共有**: OGP・Twitter Cardで正しいドメインを表示

## 今後の対応事項

### 短期
1. **Google Search Console**: 公式ドメインでのプロパティ再設定
2. **Analytics**: ドメイン統合後のトラッキング確認
3. **バックリンク**: 外部サイトでのURL変更依頼

### 中期
1. **SEO監視**: 検索順位・インデックス状況の追跡
2. **リダイレクト確認**: Vercelリダイレクトの動作検証
3. **パフォーマンス**: Core Web Vitalsへの影響確認

## 技術仕様

### リダイレクト設定
- **タイプ**: 301 Permanent Redirect
- **スコープ**: beatnexus.vercel.app → beatnexus.app
- **パス保持**: 完全URL構造を維持

### Canonical URL戦略
- **デフォルト**: 動的に公式ドメインを使用
- **カスタム**: 必要に応じて個別指定可能
- **クエリパラメータ**: デフォルトで除外

### サイトマップ仕様
- **フォーマット**: XML Sitemap 0.9
- **多言語**: hreflang対応（ja/en）
- **更新頻度**: ページタイプ別に最適化

## 守るべきルール
1. **新しいページ作成時**: `useCanonicalUrl()`を必ず使用
2. **メタタグ設定時**: `useDynamicMeta()`で統一設定を活用
3. **外部URL参照時**: `seoConfig.ts`の設定を使用
4. **Edge Function**: SITE_BASE_URLは必ず公式ドメインを使用

この実装により、SEO重複ドメイン問題が根本的に解決され、検索エンジンでの適切な評価と統一されたブランド表示が実現されます。
