# 🚨 緊急：本番Supabaseメールテンプレート更新手順

## 現在の状況
- ユーザーがパスワードリセットリンクをクリック
- 「パスワードリセットリンクが無効か期限切れです」エラーが表示
- 原因：メールテンプレートがまだ更新されていない

## 即座に実行すべき手順

### 1. 本番Supabaseダッシュボードアクセス
**URL**: https://supabase.com/dashboard/project/qgqcjtjxaoplhxurbpis/auth/templates

### 2. Reset Passwordテンプレート編集
1. 左サイドバー「Authentication」→「Email Templates」
2. 「Reset Password」をクリック
3. 「Body」フィールドを編集

### 3. 重要な変更箇所
**現在のリンク（変更前）**:
```html
<a href="{{ .ConfirmationURL }}">パスワードをリセット</a>
```

**新しいリンク（変更後）**:
```html
<a href="https://beatnexus.app/reset-password?token_hash={{ .TokenHash }}&type=recovery" style="display: inline-block; padding: 15px 35px; background: #00d4aa; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Your Password</a>
```

### 4. 完全なHTMLテンプレート
`templates/password-reset-template-direct-link.html`の内容をコピー&ペースト

### 5. Subject（件名）
```
🎵 BeatNexus Password Reset Request
```

### 6. 保存後のテスト
1. 「Save」をクリック
2. 新しいパスワードリセットメールを送信
3. 新しいメールのリンクをクリック
4. 直接パスワード設定画面が表示されることを確認

## 期待されるメールリンク（更新後）
```
https://beatnexus.app/reset-password?token_hash=f49b4130c7322f24e1bf06f50b847f79cd21f926b48802fc1b158fd4&type=recovery
```

## 緊急度：高
この更新により、ユーザーがパスワードリセットを正常に完了できるようになります。
