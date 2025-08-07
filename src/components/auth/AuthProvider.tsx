import React, { useEffect, useRef, createContext, useContext, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { detectBrowserLanguage } from '../../lib/utils';

interface AuthModalContextType {
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup' | 'resetPassword' | 'setNewPassword';
  openAuthModal: (mode: 'login' | 'signup' | 'resetPassword' | 'setNewPassword') => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { setUserFromAuth } = useAuthStore();
  const { triggerOnboardingForNewUser } = useOnboardingStore();
  const { i18n } = useTranslation();
  const processedUsers = useRef(new Set<string>());
  const authErrorCount = useRef(0);
  
  // AuthModal状態管理
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'resetPassword' | 'setNewPassword'>('login');

  const openAuthModal = (mode: 'login' | 'signup' | 'resetPassword' | 'setNewPassword') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // 電話番号保存処理（メール認証完了時）
  const processPendingPhoneVerification = async (userId: string) => {
    try {
      const pendingData = localStorage.getItem('pending_phone_verification');
      if (!pendingData) {
        console.log('No pending phone verification data found');
        return;
      }

      const { userId: storedUserId, phoneNumber, timestamp } = JSON.parse(pendingData);
      
      // ユーザーIDが一致し、24時間以内のデータかチェック
      const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24時間
      if (storedUserId !== userId) {
        console.log('Stored user ID does not match current user, skipping phone verification');
        localStorage.removeItem('pending_phone_verification');
        return;
      }
      
      if (isExpired) {
        console.log('Pending phone verification data expired, removing...');
        localStorage.removeItem('pending_phone_verification');
        return;
      }

      console.log('📱 Processing pending phone verification for user:', userId);
      
      // データベースに電話番号を保存
      const { error: phoneError } = await supabase.rpc('record_phone_verification', {
        p_user_id: userId,
        p_phone_number: phoneNumber
      });
      
      if (phoneError) {
        console.error('❌ Phone number recording failed:', phoneError);
      } else {
        console.log('✅ Phone number successfully recorded after email confirmation');
        // 成功したら一時保存データを削除
        localStorage.removeItem('pending_phone_verification');
      }
    } catch (error) {
      console.error('Error processing pending phone verification:', error);
    }
  };

  // 認証エラー時の自動リカバリ
  const handleAuthError = async (error: unknown) => {
    console.error('Auth error detected:', error);
    authErrorCount.current += 1;

    // 3回以上エラーが発生した場合は自動ログアウト
    if (authErrorCount.current >= 3) {
      console.log('Too many auth errors, signing out...');
      try {
        await supabase.auth.signOut();
        setUserFromAuth(null);
        authErrorCount.current = 0;
        // ページをリロードして状態をリセット
        window.location.reload();
      } catch (signOutError) {
        console.error('Error during sign out:', signOutError);
      }
      return;
    }

    // トークンリフレッシュを試行
    try {
      console.log('Attempting to refresh session...');
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh failed:', refreshError);
        // リフレッシュに失敗した場合はログアウト
        await supabase.auth.signOut();
        setUserFromAuth(null);
      } else {
        console.log('Session refreshed successfully');
        authErrorCount.current = 0; // エラーカウントをリセット
      }
    } catch (refreshError) {
      console.error('Unexpected error during session refresh:', refreshError);
      await supabase.auth.signOut();
      setUserFromAuth(null);
    }
  };

  // 安全な言語設定更新（新規登録時のみ）
  const initializeLanguageForNewUser = async (userId: string, eventType: string) => {
    const userKey = `${userId}-${eventType}`;
    
    // 既に処理済みの場合はスキップ
    if (processedUsers.current.has(userKey)) {
      console.log(`Language initialization already processed for ${userKey}`);
      return;
    }

    try {
      processedUsers.current.add(userKey);
      console.log(`Language initialization for new user ${userId} (${eventType}): Language should be set by handle_new_user function`);

      // データベースのhandle_new_user関数で言語設定が処理されるため、
      // フロントエンド側での追加の言語設定処理は不要
      // ただし、万が一データベース側で設定されていない場合のフォールバック処理
      if (eventType === 'signup') {
        try {
          // ユーザーの現在の言語設定を確認
          const { data, error } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', userId)
            .single();

          if (!error && (!data?.language)) {
            // 言語設定がない場合のみフォールバック
            const browserLanguage = detectBrowserLanguage();
            console.log(`Fallback: Setting language to ${browserLanguage} for user ${userId}`);
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ language: browserLanguage })
              .eq('id', userId);

            if (updateError) {
              console.warn('Failed to set fallback language for new user:', updateError);
            } else {
              console.log('Fallback language set successfully for new user');
            }
          } else {
            console.log(`User ${userId} already has language setting: ${data?.language}`);
          }
        } catch (profileError) {
          console.warn('Error checking/setting fallback language for new user:', profileError);
        }
      }

    } catch (error) {
      console.error('Error in language initialization for new user:', error);
      // 認証関連のエラーの場合はリカバリを試行
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('JWT') || errorMessage.includes('token') || errorMessage.includes('auth')) {
        await handleAuthError(error);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    // 初期セッションを取得
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          await handleAuthError(error);
          return;
        }

        if (mounted) {
          setUserFromAuth(session?.user ?? null);
          authErrorCount.current = 0; // 成功時はエラーカウントをリセット
          
          // 初期セッション取得時は言語設定処理をスキップ
          // 言語設定は useLanguageInitialization フックで処理される
        }
      } catch (error) {
        console.error('Unexpected error in getInitialSession:', error);
        if (mounted) {
          await handleAuthError(error);
        }
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;
        
        setUserFromAuth(session?.user ?? null);

        // 認証成功時はエラーカウントをリセット
        if (session?.user) {
          authErrorCount.current = 0;
          
          // メール認証完了時の電話番号保存処理
          if (event === 'SIGNED_IN' && session.user.email_confirmed_at) {
            console.log('✅ User signed in with confirmed email, processing pending phone verification...');
            await processPendingPhoneVerification(session.user.id);
          }
          
          // メール確認後のトークン更新時にも電話番号処理を実行
          if (event === 'TOKEN_REFRESHED' && session.user.email_confirmed_at) {
            console.log('🔄 Token refreshed for confirmed user, checking pending phone verification...');
            await processPendingPhoneVerification(session.user.id);
          }
        }

        // 新規登録時の処理
        if (session?.user && String(event) === 'SIGNED_UP') {
          console.log('New user signed up, setting up user...');
          
          // 言語設定
          await initializeLanguageForNewUser(session.user.id, 'signup');
          
          // 新規ユーザーへオンボーディング表示をトリガー（少し遅延を設ける）
          setTimeout(async () => {
            try {
              await triggerOnboardingForNewUser(session.user.id);
            } catch (error) {
              console.error('Failed to trigger onboarding for new user:', error);
            }
          }, 1500); // 1.5秒遅延でプロフィール作成完了を待つ
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUserFromAuth, i18n]);

  const authModalContextValue: AuthModalContextType = {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
  };

  return (
    <AuthModalContext.Provider value={authModalContextValue}>
      {children}
    </AuthModalContext.Provider>
  );
}; 