# 📧 Supabaseメールテンプレート設定手順ガイド

## 🎯 目的
GmailスパムフィルターでBeatNexusメールが迷惑メール判定されることを防ぐため、カスタムテンプレートを設定

## 🚀 設定手順

### 1. Supabaseダッシュボードにアクセス

**URL**: [https://supabase.com/dashboard/project/wdttluticnlqzmqmfvgt/auth/templates](https://supabase.com/dashboard/project/wdttluticnlqzmqmfvgt/auth/templates)

### 2. パスワードリセットテンプレート設定

#### ステップ1: Reset Passwordテンプレートを選択
1. 左サイドバー「Authentication」→「Email Templates」
2. 「Reset Password」をクリック

#### ステップ2: Subject（件名）設定
```
🎵 BeatNexus パスワードリセット / Password Reset Request
```

#### ステップ3: Body（本文）設定
`templates/password-reset-template.html`の内容をコピー&ペースト

### 3. アカウント確認テンプレート設定

#### ステップ1: Confirm Signupテンプレートを選択
1. 「Confirm signup」をクリック

#### ステップ2: Subject（件名）設定
```
🎵 BeatNexus アカウント確認 / Account Confirmation Required
```

#### ステップ3: Body（本文）設定
`templates/email-confirmation-template.html`の内容をコピー&ペースト

### 4. 送信者情報設定

#### SMTP Settings
- **Sender name**: `BeatNexus Team`
- **Sender email**: `noreply@beatnexus.app`
- **Reply-to email**: `support@beatnexus.app`

## 🔧 設定後の確認事項

### 1. テンプレートプレビュー
- Supabaseダッシュボードで「Preview」機能を使用
- 日本語・英語両方の表示確認
- リンク動作確認

### 2. テスト送信
- 診断ツールで実際の送信テスト
- 受信メールの見た目確認
- スパムフォルダに入らないか確認

### 3. 多言語対応確認
- 日本語ユーザー向け表示
- 英語ユーザー向け表示
- 文字化け確認

## 📊 スパム回避対策一覧

### テンプレート内対策
- ✅ **BeatNexusブランド明記**: 送信者が明確
- ✅ **多言語対応**: 日本語・英語併記
- ✅ **視覚的デザイン**: プロフェッショナルなHTML
- ✅ **具体的内容**: BeatNexus固有の情報
- ✅ **連絡先明記**: サポートメール記載
- ✅ **期限明記**: 24時間期限を明確化

### 技術的対策
- ✅ **適切な件名**: 絵文字と明確な目的
- ✅ **HTML構造**: 適切なセマンテックマークアップ
- ✅ **レスポンシブ対応**: モバイル表示対応
- ✅ **文字エンジング**: UTF-8設定

## 🧪 効果測定

### 測定指標
1. **配信成功率**: メール送信の成功率
2. **スパム率**: 迷惑メールフォルダ振り分け率
3. **開封率**: メール開封率
4. **クリック率**: リンククリック率
5. **ユーザーフィードバック**: 受信に関する問い合わせ

### 比較対象
- **Before**: Supabaseデフォルトテンプレート
- **After**: BeatNexusカスタムテンプレート

## 📝 実装チェックリスト

### Supabase設定
- [ ] Reset Passwordテンプレート更新
- [ ] Confirm Signupテンプレート更新
- [ ] 送信者情報設定
- [ ] プレビュー確認

### テスト確認
- [ ] 診断ツールでテスト送信
- [ ] 受信メール確認
- [ ] スパムフォルダ確認
- [ ] 多言語表示確認

### 運用確認
- [ ] 効果測定開始
- [ ] ユーザーフィードバック収集
- [ ] 必要に応じて調整

---

## 📈 期待される効果

### 技術的効果
- **スパム判定回避**: Gmail等での正常受信
- **ブランド統一**: BeatNexusアイデンティティ強化
- **多言語対応**: 日本語・英語ユーザー両方に対応

### ユーザビリティ効果
- **受信率向上**: メール到達率の向上
- **信頼性向上**: プロフェッショナルな印象
- **操作性向上**: 明確な行動指示

**重要**: 設定後は必ず実際のテスト送信を行い、受信状況を確認してください。
