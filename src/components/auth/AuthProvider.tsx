import React, { useEffect, useRef, createContext, useContext, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { detectBrowserLanguage } from '../../lib/utils';

interface AuthModalContextType {
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  openAuthModal: (mode: 'login' | 'signup') => void;
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
  const { setUser } = useAuthStore();
  const { triggerOnboardingForNewUser } = useOnboardingStore();
  const { i18n } = useTranslation();
  const processedUsers = useRef(new Set<string>());
  const authErrorCount = useRef(0);
  
  // AuthModal状態管理
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
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
        setUser(null);
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
        setUser(null);
      } else {
        console.log('Session refreshed successfully');
        authErrorCount.current = 0; // エラーカウントをリセット
      }
    } catch (refreshError) {
      console.error('Unexpected error during session refresh:', refreshError);
      await supabase.auth.signOut();
      setUser(null);
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
      const browserLanguage = detectBrowserLanguage();
      
      console.log(`Initializing language for new user ${userId} (${eventType}): ${browserLanguage}`);

      // 新規登録時のみブラウザ言語をデータベースに設定
      if (eventType === 'signup') {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ language: browserLanguage })
            .eq('id', userId);

          if (error) {
            console.warn('Failed to set initial language for new user:', error);
          } else {
            console.log('Initial language set successfully for new user');
          }
        } catch (profileError) {
          console.warn('Error setting initial language for new user:', profileError);
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
          setUser(session?.user ?? null);
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
        
        setUser(session?.user ?? null);

        // 認証成功時はエラーカウントをリセット
        if (session?.user) {
          authErrorCount.current = 0;
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
  }, [setUser, i18n]);

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