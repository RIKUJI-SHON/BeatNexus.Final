# BeatNexus Supabaseパスワードリセット機能実装仕様書

## 📅 作成日
2025年8月5日

## 🎯 概要
Supabase Auth APIを活用して、既存のAuthModalに「パスワードリセット」機能を追加し、パスワードを忘れたユーザーがメール経由で安全にパスワードをリセットできるようにする。

## 🏗️ Supabase認証アーキテクチャ

### Supabaseパスワードリセットフロー
1. **リセット要求**: `supabase.auth.resetPasswordForEmail()`でリセットメール送信
2. **メール受信**: ユーザーがSupabaseからのリセットメールを受信
3. **リンククリック**: メール内のリンクをクリック（トークン付きURLにリダイレクト）
4. **セッション復元**: Supabaseが自動的にセッションを設定
5. **新しいパスワード設定**: `supabase.auth.updateUser()`でパスワード更新

### 必要なSupabase設定
- **Site URL**: `http://localhost:3000` (開発環境) / `https://beatnexus.com` (本番環境)
- **Redirect URLs**: `http://localhost:3000/reset-password`, `https://beatnexus.com/reset-password`
- **SMTP設定**: メール送信のためのSMTP設定（Supabaseダッシュボードで設定）

## 📋 実装要件

### 機能要件
- 既存のAuthModalにパスワードリセットモードを追加
- Supabase Auth APIを使用したリセットメール送信
- リセットリンク経由での新しいパスワード設定
- 新しいパスワードの強度チェック
- セキュアなパスワードリセット処理（Supabaseネイティブ）

### 非機能要件
- 既存のAuthModalデザインとの統一性
- パスワード強度の可視化
- Supabaseセキュリティベストプラクティスの遵守
- 多言語対応（日本語・英語）

## 🚀 実装詳細

### 1. Supabase設定確認・更新

#### 1.1 認証設定の確認
- **開発環境**: `wdttluticnlqzmqmfvgt`
- **本番環境**: `qgqcjtjxaoplhxurbpis`

必要な設定：
```javascript
// Authentication > Settings > Site URL
Site URL: http://localhost:3000 (開発) / https://beatnexus.com (本番)

// Authentication > Settings > Redirect URLs
Additional Redirect URLs:
- http://localhost:3000/reset-password
- https://beatnexus.com/reset-password
```

#### 1.2 メールテンプレート設定
Supabaseダッシュボードで以下を設定：
- **Reset Password Email Template**: カスタムテンプレート作成
- **From Email**: noreply@beatnexus.com
- **Subject**: パスワードリセットのご案内 / Password Reset Request

### 2. フロントエンド実装

#### 2.1 AuthModal拡張
**ファイル**: `src/components/auth/AuthModal.tsx`

```typescript
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'resetPassword' | 'setNewPassword';
  setMode: React.Dispatch<React.SetStateAction<'login' | 'signup' | 'resetPassword' | 'setNewPassword'>>;
}

// Supabaseパスワードリセット要求
const handleSendResetEmail = async () => {
  if (!resetEmail) {
    setError(t('auth.error.emailRequired'));
    return;
  }

  setSendingResetEmail(true);
  setError(null);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;

    setResetEmailSent(true);
    
    // 成功ログ
    console.log('Password reset email sent successfully to:', resetEmail);
    
  } catch (error) {
    console.error('Password reset email error:', error);
    setError(error instanceof Error ? error.message : t('auth.error.resetEmailFailed'));
  } finally {
    setSendingResetEmail(false);
  }
};

// Supabaseパスワード更新
const handleUpdatePassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  // バリデーション
  if (!passwordStrength?.isValid) {
    setError(t('auth.error.passwordTooWeak'));
    setLoading(false);
    return;
  }

  if (newPassword !== confirmNewPassword) {
    setError(t('auth.passwordMismatch'));
    setLoading(false);
    return;
  }

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    // 成功処理
    console.log('Password updated successfully for user:', data.user?.id);
    toast.success(t('auth.passwordResetSuccess'));
    
    // フォームリセット
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordStrength(null);
    
    // モーダルを閉じてホームにリダイレクト
    onClose();
    navigate('/');
    
  } catch (error) {
    console.error('Password update error:', error);
    setError(error instanceof Error ? error.message : t('auth.error.passwordUpdateFailed'));
  } finally {
    setLoading(false);
  }
};
```

#### 2.2 ResetPasswordPage実装
**ファイル**: `src/pages/ResetPasswordPage.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/auth/AuthModal';
import { supabase } from '../lib/supabase';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'setNewPassword'>('setNewPassword');

  useEffect(() => {
    // URLハッシュからSupabaseセッション情報を抽出
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    console.log('Reset password page params:', { type, accessToken: !!accessToken, refreshToken: !!refreshToken });

    if (type === 'recovery' && accessToken && refreshToken) {
      // Supabaseセッション設定
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ data, error }) => {
        if (error) {
          console.error('Session setting error:', error);
          navigate('/');
          return;
        }
        
        console.log('Session set successfully for user:', data.user?.id);
        setIsModalOpen(true);
      });
    } else {
      // 無効なリセットリンクの場合はホームにリダイレクト
      console.warn('Invalid reset link parameters');
      navigate('/');
    }
  }, [navigate]);

  const handleClose = () => {
    setIsModalOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <AuthModal
        isOpen={isModalOpen}
        onClose={handleClose}
        initialMode="setNewPassword"
        setMode={setMode}
      />
    </div>
  );
};

export default ResetPasswordPage;
```

#### 2.3 ルーティング追加
**ファイル**: `src/App.tsx`

```tsx
import ResetPasswordPage from './pages/ResetPasswordPage';

// 既存のルート設定に追加
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

### 3. Supabase設定スクリプト

#### 3.1 認証設定更新スクリプト
**ファイル**: `scripts/setup-supabase-auth.js`

```javascript
// Supabase認証設定のための手動設定手順
/*
1. Supabaseダッシュボードにアクセス
2. Authentication > Settings に移動
3. Site URL設定:
   - 開発環境: https://localhost:5173
   - 本番環境: https://beatnexus.com

4. Redirect URLs追加:
   - https://localhost:5173/reset-password
   - https://beatnexus.com/reset-password

5. Email Templates > Reset Password:
   - Subject: BeatNexus - パスワードリセットのご案内
   - Body: カスタムHTMLテンプレート使用

6. SMTP Settings:
   - Enable custom SMTP
   - Configure with production email service
*/

console.log('Supabase認証設定手順をコンソールで確認してください');
```

### 4. テスト戦略

#### 4.1 開発環境テスト手順
1. **リセット要求テスト**
   ```bash
   # 開発サーバー起動
   npm run dev
   
   # AuthModalでパスワードリセット要求
   # 開発環境では実際のメール送信をテスト
   ```

2. **リセットフローテスト**
   ```bash
   # メール内のリンクをクリック
   # /reset-passwordページでパスワード更新をテスト
   ```

#### 4.2 本番環境デプロイ前チェック
- [ ] SMTP設定の確認
- [ ] Redirect URLs設定の確認
- [ ] メールテンプレートの確認
- [ ] セキュリティ設定の確認

### 5. セキュリティ考慮事項

#### 5.1 Supabaseネイティブセキュリティ
- リセットトークンの自動有効期限管理
- ワンタイム使用の自動実装
- セッション管理の自動化
- レート制限の自動適用

#### 5.2 追加セキュリティ対策
```typescript
// パスワード強度チェック（既存のpasswordSecurity.ts使用）
const validatePasswordStrength = (password: string): PasswordStrength => {
  // 既存の実装を使用
  return checkPasswordStrength(password);
};

// セッション検証
const validateResetSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new Error('Invalid reset session');
  }
  
  return session;
};
```

### 6. 監視・ログ

#### 6.1 ログ実装
```typescript
// パスワードリセット要求ログ
const logPasswordResetRequest = async (email: string) => {
  console.log('Password reset requested for:', email);
  // 必要に応じてSupabaseログテーブルに記録
};

// パスワード更新ログ
const logPasswordUpdate = async (userId: string) => {
  console.log('Password updated for user:', userId);
  // セキュリティログとして記録
};
```

#### 6.2 エラー監視
```typescript
// エラーレポート
const reportPasswordResetError = (error: Error, context: string) => {
  console.error(`Password reset error in ${context}:`, error);
  // 本番環境では外部監視サービスに送信
};
```

## 🧪 テスト実装

### 7.1 単体テスト
```typescript
// src/components/auth/__tests__/AuthModal.reset.test.tsx
describe('AuthModal Password Reset', () => {
  it('should send reset email successfully', async () => {
    // テスト実装
  });
  
  it('should update password successfully', async () => {
    // テスト実装
  });
  
  it('should validate password strength', () => {
    // テスト実装
  });
});
```

### 7.2 統合テスト
```typescript
// src/__tests__/integration/passwordReset.test.tsx
describe('Password Reset Integration', () => {
  it('should complete full reset flow', async () => {
    // 完全なフローテスト
  });
});
```

## 📋 実装チェックリスト

### Supabase設定
- [ ] 開発環境の認証設定更新
- [ ] 本番環境の認証設定更新
- [ ] リダイレクトURL設定
- [ ] メールテンプレート設定
- [ ] SMTP設定（本番環境）

### フロントエンド実装
- [ ] AuthModal拡張（resetPassword, setNewPassword モード）
- [ ] ResetPasswordPage作成
- [ ] ルーティング追加
- [ ] パスワード強度メーター統合
- [ ] エラーハンドリング実装
- [ ] 多言語対応

### テスト・検証
- [ ] 開発環境での動作確認
- [ ] メール送信テスト
- [ ] リセットフローテスト
- [ ] エラーケーステスト
- [ ] セキュリティテスト

### ドキュメント
- [ ] 実装ログ作成
- [ ] デプロイ手順書作成
- [ ] 運用監視指針作成

## 🔄 実装順序

1. **Supabase認証設定確認・更新** ⭐ (まずこれ)
2. **ResetPasswordPage作成とルーティング設定**
3. **AuthModal拡張実装**
4. **パスワード強度メーター統合**
5. **多言語対応完了**
6. **開発環境での動作確認**
7. **本番環境デプロイ準備**

## 📝 重要な注意事項

- **Supabaseダッシュボード設定が必須**: メール送信にはSMTP設定が必要
- **リダイレクトURL設定**: 開発・本番環境それぞれで設定必要
- **セッション管理**: Supabaseが自動で行うため、手動でのトークン管理は不要
- **メール配信**: 開発環境ではSupabaseのデフォルトメール、本番では独自SMTP推奨

---

## 📈 期待される効果

- **セキュアなパスワードリセット**: Supabaseネイティブのセキュリティ機能活用
- **運用負荷軽減**: 自動トークン管理、レート制限、有効期限管理
- **ユーザビリティ向上**: 統一されたUI/UXでのパスワードリセット
- **監査可能性**: Supabase Authのログ機能活用

この仕様書に従って、Supabaseの強力な認証機能を最大限活用したパスワードリセット機能を実装します。
