# Google Search Console URL削除申請ガイド

## 概要
BeatNexusの検索結果重複問題（beatnexus.vercel.app）を解決するための、Google Search Consoleでの削除申請手順。

## 申請日
2025年8月2日

## 問題の詳細
- **重複URL**: https://beatnexus.vercel.app/*
- **正規URL**: https://beatnexus.app/
- **問題**: 検索結果に2つのドメインが表示される

## 申請手順

### Step 1: Google Search Console へのアクセス
1. https://search.google.com/search-console/ にアクセス
2. Googleアカウントでログイン
3. `beatnexus.app` プロパティを選択

### Step 2: 削除対象プロパティの追加
**重要**: 削除申請するには、削除対象URL (`beatnexus.vercel.app`) のプロパティが必要です。

1. **beatnexus.vercel.app プロパティを追加**
   - 「プロパティを追加」をクリック
   - 「URLプレフィックス」を選択
   - `https://beatnexus.vercel.app` を入力

2. **所有権確認の実行**
   
   **方法A: HTMLファイル確認（推奨）**
   - Google提供の確認ファイルをダウンロード
   - `/public/` フォルダにアップロード
   - デプロイ後、確認ボタンをクリック
   
   **方法B: DNS確認**
   - ドメイン管理画面でTXTレコードを追加
   - `google-site-verification=[確認コード]`
   
   **方法C: メタタグ確認**
   - `index.html` の `<head>` に確認タグを追加
   - 一時的に追加し、確認後削除

3. **beatnexus.app プロパティも確認**
   - 同様に `https://beatnexus.app` も登録されていることを確認
   - 未登録の場合は同じ手順で追加

### Step 3: URL削除申請の実行

**重要**: `beatnexus.vercel.app` プロパティを選択してから削除申請を行う

1. **プロパティの切り替え**
   - Google Search Console 上部のプロパティ選択で `beatnexus.vercel.app` を選択

2. **削除ツールの使用**
   - 左側メニューから「削除」をクリック
   - 「一時的な削除」タブを選択
   - 「新しいリクエスト」ボタンをクリック

3. **削除対象の指定**
   - URL: `https://beatnexus.vercel.app/` （または `/*` で全ページ）
   - 削除タイプ: 「URLをGoogleから一時的に削除する」を選択

### Step 4: 削除申請の詳細設定

#### 申請するURL
```
https://beatnexus.vercel.app/
```

#### 削除タイプ
- **選択**: 「URLをGoogleから一時的に削除する」
- **期間**: 約6ヶ月間

#### 削除理由
- **重複コンテンツ**
- **正規URL**: https://beatnexus.app/

### Step 5: 技術的対策の確認

以下の技術的対策が実装済みであることを確認：

#### ✅ リダイレクト設定
```json
// vercel.json
{
  "redirects": [
    {
      "source": "/(.*)",
      "has": [{"type": "host", "value": "beatnexus.vercel.app"}],
      "destination": "https://beatnexus.app/$1",
      "permanent": true
    }
  ]
}
```

#### ✅ robots.txt設定
```
# Block Vercel subdomains
User-agent: *
Disallow: /
Host: beatnexus.vercel.app

# Only allow main domain
Host: beatnexus.app
```

#### ✅ Canonical URL設定
- HTMLヘッダーに正規URLを指定
- HTTPヘッダーでCanonicalリンクを設定

### Step 6: 申請後の確認

#### 即座に確認すべき項目
1. リダイレクトが正常に動作しているか
   ```bash
   curl -I https://beatnexus.vercel.app/
   # 期待される結果: 301 Moved Permanently → https://beatnexus.app/
   ```

2. robots.txtが正しく配信されているか
   ```
   https://beatnexus.app/robots.txt
   ```

#### 1-3日後に確認すべき項目
1. Google Search Consoleの「削除」ページで申請状況を確認
2. 検索結果での表示状況を確認

#### 1週間後に確認すべき項目
1. 検索結果から `beatnexus.vercel.app` が除外されているか確認
2. `beatnexus.app` のみが表示されているか確認

## 追加対策（必要に応じて）

### Bing Webmaster Tools
Googleだけでなく、Bingでも同様の申請を行う：
1. https://www.bing.com/webmasters にアクセス
2. サイトを追加・確認
3. 「Block URLs」機能で同様の削除申請

### 継続的な監視
1. 月1回の検索結果確認
2. Google Analytics でのトラフィック監視
3. 重複インデックスの早期発見

## トラブルシューティング

### 申請が却下された場合
1. リダイレクト設定を再確認
2. robots.txtの設定を再確認
3. 48時間待ってから再申請

### 削除に時間がかかる場合
- 通常1-3日で反映
- 最大で1週間程度かかることがある
- 技術的対策が適切に実装されていれば、新しいクロールでは正規URLのみが認識される

## 成功判定基準
✅ Google検索で「BeatNexus」と検索した時に、`beatnexus.app` のみが表示される
✅ `site:beatnexus.vercel.app` で検索した時に、結果が表示されないか、リダイレクト情報が表示される
✅ Google Search Consoleで削除申請が「完了」となっている

---

**最終更新**: 2025年8月2日
**担当者**: BeatNexus開発チーム
**関連ファイル**: 
- `/public/robots.txt`
- `/vercel.json`
- `/index.html` (canonical URL設定)
