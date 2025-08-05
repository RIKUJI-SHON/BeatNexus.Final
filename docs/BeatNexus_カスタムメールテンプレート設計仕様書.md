# BeatNexus カスタムメールテンプレート設計仕様書

## 📅 作成日
2025年8月5日

## 🎯 目的
Gmailスパムフィルター回避とユーザビリティ向上のため、BeatNexus専用のメールテンプレートを作成

## 🚨 現在の問題
- Supabaseデフォルトテンプレートがスパム判定
- 英語のみで多言語対応なし
- BeatNexusブランドとの不一致

## 🎨 新テンプレート設計

### 1. パスワードリセットメール

#### 件名 (Subject)
```
日本語: 🎵 BeatNexus パスワードリセットのご案内
英語: 🎵 BeatNexus Password Reset Request
```

#### 本文テンプレート (HTML)
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .content { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { color: #667eea; font-size: 32px; margin: 0; font-weight: bold; }
        .logo p { color: #666; margin: 5px 0 0 0; font-size: 14px; }
        .button { display: inline-block; padding: 15px 30px; background: #00d4aa; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; transition: all 0.3s; }
        .button:hover { background: #00b894; transform: translateY(-2px); }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="logo">
                <h1>🎵 BeatNexus</h1>
                <p>ビートボクサーのための競技プラットフォーム</p>
            </div>
            
            <!-- 日本語版 -->
            <div class="ja-content">
                <h2 style="color: #333; border-bottom: 2px solid #00d4aa; padding-bottom: 10px;">パスワードリセットのご案内</h2>
                
                <p>BeatNexusをご利用いただき、ありがとうございます。</p>
                
                <p>アカウントのパスワードリセットをご希望との連絡を受けました。下記のボタンをクリックして、新しいパスワードを設定してください。</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{ .ConfirmationURL }}" class="button">🔐 新しいパスワードを設定</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ 重要なお知らせ</strong><br>
                    • このリンクは24時間以内に有効期限が切れます<br>
                    • 心当たりがない場合は、このメールを無視してください<br>
                    • セキュリティのため、強力なパスワードを設定してください
                </div>
                
                <p>ご不明な点がございましたら、<a href="mailto:support@beatnexus.app" style="color: #00d4aa;">support@beatnexus.app</a> までお気軽にお問い合わせください。</p>
                
                <p>今後ともBeatNexusをよろしくお願いいたします。</p>
            </div>
            
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
            
            <!-- English版 -->
            <div class="en-content">
                <h2 style="color: #333; border-bottom: 2px solid #00d4aa; padding-bottom: 10px;">Password Reset Request</h2>
                
                <p>Thank you for using BeatNexus!</p>
                
                <p>We received a request to reset your account password. Click the button below to set a new password.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{ .ConfirmationURL }}" class="button">🔐 Set New Password</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important Notice</strong><br>
                    • This link will expire in 24 hours<br>
                    • If you didn't request this, please ignore this email<br>
                    • For security, please set a strong password
                </div>
                
                <p>If you have any questions, feel free to contact us at <a href="mailto:support@beatnexus.app" style="color: #00d4aa;">support@beatnexus.app</a>.</p>
                
                <p>Thank you for using BeatNexus!</p>
            </div>
            
            <div class="footer">
                <p>© 2025 BeatNexus. All rights reserved.</p>
                <p>This email was sent to you because you requested a password reset.</p>
                <p>BeatNexus - The Ultimate Beatboxing Competition Platform</p>
            </div>
        </div>
    </div>
</body>
</html>
```

### 2. アカウント確認メール

#### 件名
```
日本語: 🎵 BeatNexus アカウント確認のお願い
英語: 🎵 BeatNexus Account Confirmation Required
```

#### 本文テンプレート
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        /* 同じCSSスタイル */
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="logo">
                <h1>🎵 BeatNexus</h1>
                <p>ビートボクサーのための競技プラットフォーム</p>
            </div>
            
            <!-- 日本語版 -->
            <div class="ja-content">
                <h2 style="color: #333; border-bottom: 2px solid #00d4aa; padding-bottom: 10px;">BeatNexusへようこそ！</h2>
                
                <p>BeatNexusにご登録いただき、ありがとうございます！</p>
                
                <p>アカウントの作成が完了しました。下記のボタンをクリックして、メールアドレスの確認を行ってください。</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{ .ConfirmationURL }}" class="button">📧 メールアドレスを確認</a>
                </div>
                
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1976d2; margin-top: 0;">🎯 BeatNexusでできること</h3>
                    <ul style="color: #333; margin: 0;">
                        <li>🎤 ビートボクシングバトルに参加</li>
                        <li>🏆 レーティングシステムでランキング上昇</li>
                        <li>👥 グローバルコミュニティとの交流</li>
                        <li>🎵 スキル向上とパフォーマンス共有</li>
                    </ul>
                </div>
                
                <div class="warning">
                    <strong>📝 次のステップ</strong><br>
                    1. メールアドレス確認を完了<br>
                    2. プロフィールを設定<br>
                    3. 初回バトルに挑戦！
                </div>
            </div>
            
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
            
            <!-- English版 -->
            <div class="en-content">
                <h2 style="color: #333; border-bottom: 2px solid #00d4aa; padding-bottom: 10px;">Welcome to BeatNexus!</h2>
                
                <p>Thank you for signing up for BeatNexus!</p>
                
                <p>Your account has been created successfully. Please click the button below to confirm your email address.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{ .ConfirmationURL }}" class="button">📧 Confirm Email Address</a>
                </div>
                
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1976d2; margin-top: 0;">🎯 What You Can Do on BeatNexus</h3>
                    <ul style="color: #333; margin: 0;">
                        <li>🎤 Participate in beatboxing battles</li>
                        <li>🏆 Climb rankings with our rating system</li>
                        <li>👥 Connect with global community</li>
                        <li>🎵 Improve skills and share performances</li>
                    </ul>
                </div>
                
                <div class="warning">
                    <strong>📝 Next Steps</strong><br>
                    1. Complete email confirmation<br>
                    2. Set up your profile<br>
                    3. Join your first battle!
                </div>
            </div>
            
            <div class="footer">
                <p>© 2025 BeatNexus. All rights reserved.</p>
                <p>This email was sent because you created a BeatNexus account.</p>
                <p>BeatNexus - The Ultimate Beatboxing Competition Platform</p>
            </div>
        </div>
    </div>
</body>
</html>
```

## 🔧 Supabaseテンプレート設定手順

### 1. パスワードリセットテンプレート設定

1. [Supabaseダッシュボード](https://supabase.com/dashboard/project/wdttluticnlqzmqmfvgt/auth/templates) を開く
2. 「Email Templates」→「Reset Password」を選択
3. 以下を設定：

**Subject**:
```
🎵 BeatNexus パスワードリセットのご案内 / Password Reset Request
```

**Body (HTML)**:
上記のHTMLテンプレートを貼り付け

### 2. 確認メールテンプレート設定

**Subject**:
```
🎵 BeatNexus アカウント確認のお願い / Account Confirmation Required
```

**Body (HTML)**:
上記の確認メール用HTMLテンプレートを貼り付け

## 📊 スパム回避の工夫

### テンプレート内の対策
1. **BeatNexusブランディング**: 明確な送信者識別
2. **多言語対応**: 日本語・英語併記でローカライズ
3. **視覚的デザイン**: プロフェッショナルなHTML構造
4. **具体的内容**: サービス固有の情報を含む
5. **連絡先明記**: サポートメール記載
6. **法的情報**: 著作権表示とプライバシー配慮

### 技術的対策
1. **From名設定**: "BeatNexus Team <noreply@beatnexus.app>"
2. **Reply-To設定**: support@beatnexus.app
3. **SPF/DKIM設定**: Resendで自動設定済み
4. **適切な件名**: 絵文字と明確な目的

## 🧪 テスト計画

### A/Bテストで効果確認
1. **現在**: デフォルトテンプレート
2. **新版**: カスタムテンプレート
3. **比較指標**: 
   - スパム率
   - 開封率
   - クリック率
   - ユーザーフィードバック
