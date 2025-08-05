# 🔧 Resend SMTP設定修正ガイド - localhost:3000ドメイン追加

## 📅 修正日
2025年8月5日

## 🚨 判明した問題
**根本原因**: ResendのSMTP設定で許可ドメインに開発環境のドメインが含まれていない

### 現在の設定状況
- ✅ **本番ドメイン**: `beatnexus.app` - 設定済み
- ❌ **開発ドメイン**: `localhost:3000` - **未設定**

## 🔧 緊急修正手順

### 1. Resendダッシュボードでのドメイン追加

**手順**:
1. [Resendダッシュボード](https://resend.com/domains) にアクセス
2. 「Add Domain」または「Domains」セクションを開く
3. 開発環境用ドメインを追加:
   - **Domain**: `localhost` または `localhost:3000`
   - **Environment**: Development

### 2. Supabase SMTP設定の確認・更新

**Supabaseダッシュボード設定**:
```
https://supabase.com/dashboard/project/wdttluticnlqzmqmfvgt/settings/auth

SMTP Settings:
- Enable custom SMTP: ON
- SMTP Host: smtp.resend.com
- SMTP Port: 587
- SMTP User: resend
- SMTP Pass: [ResendのAPIキー]
- Sender email: noreply@beatnexus.app （または許可されたドメイン）
```

### 3. 代替解決策（即座に実装可能）

#### オプション A: Supabaseデフォルトメール使用
```
SMTP Settings > Enable custom SMTP: OFF
```
**メリット**: 即座に動作、ドメイン制限なし

#### オプション B: 開発環境専用の環境変数設定
開発環境とプロダクション環境で異なるSMTP設定を使用

## 🚀 実装手順

### ステップ1: 即座の解決（推奨）

**Supabaseダッシュボードで**:
1. SMTP Settings → Enable custom SMTP: **OFF**
2. Save
3. 10分待機
4. 診断ツールで再テスト

### ステップ2: 長期的解決

**Resendダッシュボードで**:
1. 開発環境用ドメイン追加
2. DNS設定（必要に応じて）
3. Supabase SMTP設定更新

## 📊 設定比較表

| 環境 | ドメイン | Resend設定 | Supabase設定 |
|------|----------|------------|--------------|
| 本番 | beatnexus.app | ✅ 設定済み | カスタムSMTP使用 |
| 開発 | localhost:3000 | ❌ 未設定 | デフォルトSMTP推奨 |

## 🔍 診断ツール更新

診断ツールにResend関連の診断を追加します。
