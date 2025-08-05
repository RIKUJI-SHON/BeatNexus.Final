# BeatNexus AuthModalパスワードリセット機能実装仕様書

## 📅 作成日
2025年8月5日

## 🎯 概要
既存のAuthModalに「パスワードリセット」機能を追加し、パスワードを忘れたユーザーがメール経由で安全にパスワードをリセットできるようにする。

## 📋 要件定義

### 機能要件
- 既存のAuthModalにパスワードリセットモードを追加
- メールアドレス入力によるリセットリンク送信
- リセットリンク経由での新しいパスワード設定
- 新しいパスワードの強度チェック
- セキュアなパスワードリセット処理

### 非機能要件
- 既存のAuthModalデザインとの統一性
- パスワード強度の可視化
- セキュリティベストプラクティスの遵守（リンク有効期限、ワンタイム使用）
- 多言語対応（日本語・英語）

## 🚀 機能仕様

### 1. AuthModalモード拡張
**変更対象**: `src/components/auth/AuthModal.tsx`

#### 1.1 インターフェース更新
```typescript
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'resetPassword' | 'setNewPassword';
  setMode: React.Dispatch<React.SetStateAction<'login' | 'signup' | 'resetPassword' | 'setNewPassword'>>;
}
```

#### 1.2 状態管理の追加
```typescript
const [resetEmail, setResetEmail] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmNewPassword, setConfirmNewPassword] = useState('');
const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
const [resetEmailSent, setResetEmailSent] = useState(false);
const [sendingResetEmail, setSendingResetEmail] = useState(false);
```

### 2. UI要素の実装

#### 2.1 タブナビゲーション更新
- 「ログイン」「新規登録」の2タブ構成を維持
- ログインタブ内に「パスワードを忘れた方」リンクを追加

#### 2.2 パスワードリセット要求フォーム
```tsx
{mode === 'resetPassword' && (
  <>
    <div className="text-center mb-6">
      <h3 className="text-lg font-medium text-white mb-2">
        {t('auth.resetPassword')}
      </h3>
      <p className="text-sm text-gray-400">
        {t('auth.resetPasswordDescription')}
      </p>
    </div>

    {!resetEmailSent ? (
      <div>
        <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-300 mb-2">
          {t('auth.email')}
        </label>
        <input
          type="email"
          id="resetEmail"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
          placeholder={t('auth.emailPlaceholder')}
          required
        />
        
        <button
          type="button"
          onClick={handleSendResetEmail}
          disabled={sendingResetEmail}
          className="w-full mt-4 transition-all bg-cyan-500 text-white px-6 py-3 rounded-lg border-cyan-600 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-60 disabled:hover:translate-y-0 font-semibold"
        >
          {sendingResetEmail ? t('auth.sendingResetEmail') : t('auth.sendResetEmail')}
        </button>

        <button
          type="button"
          onClick={() => switchMode('login')}
          className="w-full mt-3 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {t('auth.backToLogin')}
        </button>
      </div>
    ) : (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
          <MailCheck className="w-8 h-8 text-green-400" />
        </div>
        <h4 className="text-lg font-medium text-white mb-2">
          {t('auth.resetEmailSent')}
        </h4>
        <p className="text-sm text-gray-400 mb-6">
          {t('auth.resetEmailSentDescription', { email: resetEmail })}
        </p>
        <button
          type="button"
          onClick={() => {
            setResetEmailSent(false);
            setResetEmail('');
            switchMode('login');
          }}
          className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
        >
          {t('auth.backToLogin')}
        </button>
      </div>
    )}
  </>
)}
```

#### 2.3 新しいパスワード設定フォーム（リセットリンク経由）
```tsx
{mode === 'setNewPassword' && (
  <>
    <div className="text-center mb-6">
      <h3 className="text-lg font-medium text-white mb-2">
        {t('auth.setNewPassword')}
      </h3>
      <p className="text-sm text-gray-400">
        {t('auth.setNewPasswordDescription')}
      </p>
    </div>

    <div>
      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
        {t('auth.newPassword')}
      </label>
      <div className="relative">
        <input
          type={showNewPassword ? 'text' : 'password'}
          id="newPassword"
          value={newPassword}
          onChange={handleNewPasswordChange}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors pr-12"
          placeholder={t('auth.newPasswordPlaceholder')}
          required
          minLength={8}
        />
        <button
          type="button"
          onClick={() => setShowNewPassword(!showNewPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
        >
          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      
      {/* パスワード強度メーター */}
      {newPassword && passwordStrength && (
        <PasswordStrengthMeter strength={passwordStrength} />
      )}
    </div>

    <div>
      <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-300 mb-2">
        {t('auth.confirmNewPassword')}
      </label>
      <div className="relative">
        <input
          type={showConfirmNewPassword ? 'text' : 'password'}
          id="confirmNewPassword"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors pr-12"
          placeholder={t('auth.confirmNewPasswordPlaceholder')}
          required
          minLength={8}
        />
        <button
          type="button"
          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
        >
          {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {confirmNewPassword && newPassword !== confirmNewPassword && (
        <p className="text-red-400 text-sm mt-2">{t('auth.passwordMismatch')}</p>
      )}
    </div>

    <button
      type="submit"
      className="w-full mt-6 transition-all bg-cyan-500 text-white px-6 py-3 rounded-lg border-cyan-600 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-60 disabled:hover:translate-y-0 font-semibold"
      disabled={loading || !passwordStrength?.isValid}
    >
      {loading ? t('auth.updatingPassword') : t('auth.updatePassword')}
    </button>
  </>
)}
```

#### 2.4 ログインフォームに「パスワードを忘れた方」リンク追加
```tsx
{mode === 'login' && (
  <>
    {/* 既存のログインフォーム */}
    
    <div className="text-center">
      <button
        type="button"
        onClick={() => switchMode('resetPassword')}
        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {t('auth.forgotPassword')}
      </button>
    </div>
  </>
)}
```

### 3. パスワード強度メーターコンポーネント

#### 3.1 新規コンポーネント作成
**ファイル**: `src/components/ui/PasswordStrengthMeter.tsx`

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PasswordStrength, getPasswordStrengthDisplay, getPasswordStrengthWidth } from '../../utils/passwordSecurity';

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ strength }) => {
  const { t } = useTranslation();
  const display = getPasswordStrengthDisplay(strength.level);
  const width = getPasswordStrengthWidth(strength.score);

  return (
    <div className="mt-2 space-y-2">
      {/* プログレスバー */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${display.bgColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
      
      {/* 強度表示 */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${display.color}`}>
          {display.icon} {t(`auth.passwordStrength.${strength.level}`)}
        </span>
        <span className="text-xs text-gray-400">
          {strength.score}/100
        </span>
      </div>
      
      {/* フィードバック */}
      {strength.feedback.length > 0 && (
        <div className="text-xs text-gray-400 space-y-1">
          {strength.feedback.map((feedback, index) => (
            <div key={index}>• {feedback}</div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 4. バックエンド処理

#### 4.1 パスワードリセット要求ハンドラー
```typescript
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
  } catch (error) {
    console.error('Password reset email error:', error);
    setError(error instanceof Error ? error.message : t('auth.error.resetEmailFailed'));
  } finally {
    setSendingResetEmail(false);
  }
};
```

#### 4.2 パスワード更新ハンドラー（リセットリンク経由）
```typescript
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
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    // 成功処理
    toast.success(t('auth.passwordResetSuccess'));
    onClose();
    navigate('/'); // ホームページにリダイレクト
    
    // フォームリセット
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordStrength(null);

  } catch (error) {
    console.error('Password update error:', error);
    setError(error instanceof Error ? error.message : t('auth.error.passwordUpdateFailed'));
  } finally {
    setLoading(false);
  }
};
```

#### 4.3 パスワード強度チェック
```typescript
const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const password = e.target.value;
  setNewPassword(password);
  
  if (password) {
    const strength = validatePasswordStrength(password);
    setPasswordStrength(strength);
  } else {
    setPasswordStrength(null);
  }
};
```

#### 4.4 リセットリンクからの遷移処理
```typescript
// URLパラメータからリセットトークンを検出
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const type = urlParams.get('type');

  if (type === 'recovery' && accessToken && refreshToken) {
    // パスワードリセットモードに切り替え
    setLocalMode('setNewPassword');
    setParentMode('setNewPassword');
    
    // Supabaseセッション設定
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }
}, []);
```

### 5. AuthProvider更新

#### 5.1 インターフェース拡張
**ファイル**: `src/components/auth/AuthProvider.tsx`

```typescript
interface AuthModalContextType {
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup' | 'resetPassword' | 'setNewPassword';
  openAuthModal: (mode: 'login' | 'signup' | 'resetPassword' | 'setNewPassword') => void;
  closeAuthModal: () => void;
}
```

### 6. パスワードリセット専用ページ（オプション）

#### 6.1 新規ページ作成
**ファイル**: `src/pages/ResetPasswordPage.tsx`

```tsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthModal } from '../components/auth/AuthModal';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [mode, setMode] = useState<'setNewPassword'>('setNewPassword');

  useEffect(() => {
    const type = searchParams.get('type');
    if (type !== 'recovery') {
      // リセットリンクでない場合はホームにリダイレクト
      navigate('/');
    }
  }, [searchParams, navigate]);

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

#### 6.2 ルーティング追加
**ファイル**: `src/App.tsx` または対応するルーティングファイル

```tsx
import ResetPasswordPage from './pages/ResetPasswordPage';

// ルート設定に追加
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

### 7. 多言語対応

#### 7.1 翻訳キー追加
**ファイル**: `src/i18n/locales/ja.json`

```json
{
  "auth": {
    "forgotPassword": "パスワードを忘れた方",
    "resetPassword": "パスワードリセット",
    "resetPasswordDescription": "登録したメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。",
    "sendResetEmail": "リセットメールを送信",
    "sendingResetEmail": "送信中...",
    "resetEmailSent": "メールを送信しました",
    "resetEmailSentDescription": "{{email}} にパスワードリセット用のリンクをお送りしました。メールをご確認ください。",
    "backToLogin": "ログインに戻る",
    "setNewPassword": "新しいパスワードを設定",
    "setNewPasswordDescription": "新しいパスワードを入力してください。",
    "newPassword": "新しいパスワード",
    "confirmNewPassword": "新しいパスワード（確認）",
    "newPasswordPlaceholder": "新しいパスワードを入力",
    "confirmNewPasswordPlaceholder": "新しいパスワードを再入力",
    "updatePassword": "パスワードを更新",
    "updatingPassword": "更新中...",
    "passwordResetSuccess": "パスワードが正常にリセットされました",
    "passwordStrength": {
      "very_weak": "非常に弱い",
      "weak": "弱い",
      "fair": "普通",
      "good": "良い",
      "strong": "強力"
    },
    "error": {
      "emailRequired": "メールアドレスが必要です",
      "resetEmailFailed": "リセットメールの送信に失敗しました",
      "passwordTooWeak": "パスワードが弱すぎます",
      "passwordUpdateFailed": "パスワードの更新に失敗しました"
    }
  }
}
```

**ファイル**: `src/i18n/locales/en.json`

```json
{
  "auth": {
    "forgotPassword": "Forgot Password?",
    "resetPassword": "Reset Password",
    "resetPasswordDescription": "Enter your registered email address. We'll send you a password reset link.",
    "sendResetEmail": "Send Reset Email",
    "sendingResetEmail": "Sending...",
    "resetEmailSent": "Email Sent",
    "resetEmailSentDescription": "We've sent a password reset link to {{email}}. Please check your email.",
    "backToLogin": "Back to Login",
    "setNewPassword": "Set New Password",
    "setNewPasswordDescription": "Enter your new password.",
    "newPassword": "New Password",
    "confirmNewPassword": "Confirm New Password",
    "newPasswordPlaceholder": "Enter new password",
    "confirmNewPasswordPlaceholder": "Re-enter new password",
    "updatePassword": "Update Password",
    "updatingPassword": "Updating...",
    "passwordResetSuccess": "Password reset successfully",
    "passwordStrength": {
      "very_weak": "Very Weak",
      "weak": "Weak", 
      "fair": "Fair",
      "good": "Good",
      "strong": "Strong"
    },
    "error": {
      "emailRequired": "Email address is required",
      "resetEmailFailed": "Failed to send reset email",
      "passwordTooWeak": "Password is too weak",
      "passwordUpdateFailed": "Failed to update password"
    }
  }
}
```

### 8. UI/UX考慮事項

#### 8.1 デザイン統一
- 既存のAuthModalのデザインパターンを踏襲
- カラーパレット：cyan-400 (フォーカス), gray-800 (背景), red-400 (エラー), green-400 (成功)
- ボタンスタイル：3Dエフェクト付きの統一デザイン

#### 8.2 アクセシビリティ
- 適切なaria-label属性
- キーボードナビゲーション対応
- スクリーンリーダー対応

#### 8.3 ユーザビリティ
- パスワード表示/非表示切り替え
- リアルタイムパスワード強度表示
- 明確なエラーメッセージ
- 成功フィードバック
- メール送信成功状態の視覚的フィードバック

## 🔒 セキュリティ要件

### 9.1 パスワード要件
- 最小8文字以上
- 大文字、小文字、数字、特殊文字のうち3種類以上
- 一般的なパスワードパターンの禁止
- HaveIBeenPwned APIによる侵害チェック（オプション）

### 9.2 リセットフロー
1. メールアドレス確認
2. Supabase Auth APIによる安全なリセットメール送信
3. リセットリンクのワンタイム使用（有効期限付き）
4. 新しいパスワードの強度確認
5. セッション自動ログイン

## 🧪 テスト要件

### 10.1 単体テスト
- パスワード強度バリデーション
- フォームバリデーション
- エラーハンドリング
- メール送信機能

### 10.2 統合テスト
- パスワードリセットフロー全体
- リセットリンク処理
- エラー状態での適切な処理

### 10.3 E2Eテスト
- ユーザージャーニー全体（リセット要求→メール受信→新パスワード設定）
- 多言語での動作確認
- 各種エラーケースでの動作

## 📋 実装チェックリスト

### フロントエンド
- [ ] AuthModalPropsインターフェース更新
- [ ] パスワードリセットモードの追加
- [ ] パスワード強度メーター実装
- [ ] フォームバリデーション実装
- [ ] エラーハンドリング実装
- [ ] 多言語対応
- [ ] UI/UXの統一性確保
- [ ] リセット専用ページ作成（オプション）

### バックエンド
- [ ] パスワードリセット要求処理実装
- [ ] パスワード更新処理実装
- [ ] リセットリンク処理実装
- [ ] セキュリティバリデーション
- [ ] エラーハンドリング

### テスト
- [ ] 単体テスト作成
- [ ] 統合テスト作成
- [ ] E2Eテスト作成
- [ ] セキュリティテスト

### ドキュメント
- [ ] 実装ログ作成
- [ ] ユーザーガイド更新
- [ ] 開発者ドキュメント更新

## 🚀 実装順序

1. **PasswordStrengthMeterコンポーネント作成**
2. **多言語対応（翻訳追加）**
3. **AuthModalインターフェース更新**
4. **パスワードリセット要求UI実装**
5. **メール送信成功UI実装**
6. **新パスワード設定UI実装**
7. **バックエンド処理実装**
8. **リセット専用ページ作成**
9. **AuthProvider更新**
10. **テスト実装**
11. **統合テストと調整**

## 📝 注意事項

- 既存のAuthModalの動作に影響を与えない
- Supabase Auth APIのベストプラクティスに従う
- セキュリティベストプラクティスを遵守
- パフォーマンスへの影響を最小限に抑える
- レスポンシブデザインに対応
- メール送信失敗時の適切なエラー処理
- リセットリンクの有効期限管理

---

## 📈 期待される効果

- ユーザビリティの向上（パスワードを忘れたユーザーの救済）
- セキュリティ意識の向上（パスワード強度の可視化）
- UX統一性の向上（認証関連機能の集約）
- 管理性の向上（認証機能の統一化）
- ユーザー離脱率の低減（パスワード忘れによる離脱防止）
