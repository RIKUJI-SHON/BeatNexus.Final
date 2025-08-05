# 🔧 Supabase SMTP設定問題 解決ガイド

## 📅 作成日
2025年8月5日

## 🚨 現在の状況
- パスワードリセットAPI呼び出し: ✅ 成功
- メール受信: ❌ 失敗
- **診断結果**: SMTP設定に問題あり

## 🔍 SMTP設定確認手順（緊急）

### 1. Supabaseダッシュボード確認

**手順**:
1. [Supabaseダッシュボード](https://supabase.com/dashboard/project/wdttluticnlqzmqmfvgt/settings/auth) を開く
2. 左サイドバー「Settings」→「Authentication」をクリック
3. ページ下部の「SMTP Settings」セクションを確認

### 2. SMTP設定の選択肢

#### オプション A: Supabaseデフォルトメール使用（推奨）
**設定**:
- ✅ **Enable custom SMTP**: OFF（無効）
- ✅ **Enable email confirmations**: ON（有効）

**メリット**:
- 設定不要
- すぐに動作
- 開発環境に最適

#### オプション B: カスタムSMTP使用
**必要な設定**:
- Enable custom SMTP: ON（有効）
- SMTP Host: 例）smtp.gmail.com
- SMTP Port: 587 または 465
- SMTP User: your-email@gmail.com
- SMTP Pass: アプリパスワード
- Sender name: BeatNexus
- Sender email: noreply@yourdomain.com

### 3. 緊急対応：設定確認と修正

#### 3.1 現在の設定確認
**Supabaseダッシュボードで確認する項目**:

1. **Authentication Settings**
   - [ ] Site URL: `http://localhost:3000`
   - [ ] Redirect URLs: `http://localhost:3000/reset-password`

2. **SMTP Settings**
   - [ ] Enable custom SMTP: 状態を確認
   - [ ] SMTP provider設定（有効な場合）

3. **Email Templates**
   - [ ] Reset Password: 有効状態を確認
   - [ ] Template内容: `{{ .ConfirmationURL }}` 含有確認

#### 3.2 推奨修正手順

**ステップ1: デフォルトSMTPに切り替え**
```
SMTP Settings > Enable custom SMTP: OFF
↓
Save
```

**ステップ2: Email確認設定**
```
Authentication Settings > Enable email confirmations: ON
```

**ステップ3: テンプレート確認**
```
Email Templates > Reset Password > Enable
```

### 4. 設定後のテスト手順

#### 4.1 設定反映待機
- 設定変更後、**10-15分待機**
- Supabase側でのSMTP設定反映時間

#### 4.2 診断ツールで再テスト
```html
診断ツール（debug-password-reset.html）で:
1. ログクリア
2. Supabase接続テスト
3. パスワードリセット送信テスト
```

## 🔧 詳細診断：SMTP設定状況の確認

### 開発環境でのベストプラクティス

#### 推奨設定パターン
```javascript
// Supabase開発環境での推奨SMTP設定
{
  "enable_custom_smtp": false,  // デフォルトSMTP使用
  "site_url": "http://localhost:3000",
  "redirect_urls": ["http://localhost:3000/reset-password"],
  "email_confirmations": true,
  "templates": {
    "reset_password": {
      "enabled": true,
      "subject": "Reset your password",
      "template": "Default template with {{ .ConfirmationURL }}"
    }
  }
}
```

### トラブルシューティング表

| 症状 | 原因 | 解決策 |
|------|------|--------|
| API成功、メール未着 | SMTP設定無効 | Enable custom SMTP: OFF |
| 「SMTP error」メッセージ | SMTP認証エラー | 認証情報確認・修正 |
| 「Template error」 | テンプレート問題 | デフォルトテンプレート使用 |
| 「Rate limit」 | 送信制限 | 時間をおいて再試行 |

## 🚨 緊急対応手順

### 即座に実行すべき操作

1. **Supabaseダッシュボードにアクセス**
   ```
   https://supabase.com/dashboard/project/wdttluticnlqzmqmfvgt/settings/auth
   ```

2. **SMTP設定を無効化（デフォルト使用）**
   ```
   SMTP Settings > Enable custom SMTP: OFF → Save
   ```

3. **10分待機**
   ```
   設定反映のため10-15分待機
   ```

4. **再テスト**
   ```
   診断ツールで再度パスワードリセット送信テスト
   ```

## 📊 設定確認チェックリスト

### 必須確認項目
- [ ] Site URL: `http://localhost:3000`
- [ ] Redirect URLs: `http://localhost:3000/reset-password`追加済み
- [ ] Enable custom SMTP: OFF（デフォルト使用）
- [ ] Email confirmations: ON
- [ ] Reset Password template: 有効

### テスト確認項目
- [ ] 診断ツール接続テスト成功
- [ ] パスワードリセット送信成功
- [ ] 10-15分待機後メール受信確認
- [ ] スパムフォルダ確認

## 📞 さらなるサポート

### Supabase公式リソース
1. [Supabase Auth設定ドキュメント](https://supabase.com/docs/guides/auth/auth-smtp)
2. [メール配信トラブルシューティング](https://supabase.com/docs/guides/auth/auth-email-templates)
3. [Supabaseコミュニティフォーラム](https://github.com/supabase/supabase/discussions)

### 代替案
**メール送信が解決しない場合**:
1. **Gmail SMTP使用**: アプリパスワード設定でGmail経由送信
2. **SendGrid連携**: 外部メールサービス使用
3. **一時的回避**: パスワード変更を設定画面のみで実装

---

**重要**: まず、Supabaseダッシュボードで「Enable custom SMTP: OFF」に設定し、10-15分待ってから再テストしてください。これが最も効果的な解決策です。
