import React, { useEffect, useRef, createContext, useContext, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

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

  // ブラウザ言語を検出する関数
  const detectBrowserLanguage = (): string => {
    const browserLanguages = navigator.languages || [navigator.language];
    
    for (const lang of browserLanguages) {
      const normalizedLang = lang.toLowerCase();
      if (normalizedLang.startsWith('ja')) {
        return 'ja';
      }
      if (normalizedLang.startsWith('en')) {
        return 'en';
      }
    }
    return 'en'; // デフォルト
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

  // 安全な言語設定更新（重複処理を防ぐ）
  const safeUpdateLanguage = async (userId: string, eventType: string) => {
    const userKey = `${userId}-${eventType}`;
    
    // 既に処理済みの場合はスキップ
    if (processedUsers.current.has(userKey)) {
      console.log(`Language update already processed for ${userKey}`);
      return;
    }

    try {
      processedUsers.current.add(userKey);
      const browserLanguage = detectBrowserLanguage();
      
      console.log(`Safe language update for user ${userId} (${eventType}): ${browserLanguage}`);

      // i18nの言語を即座に更新
      if (i18n.language !== browserLanguage) {
        i18n.changeLanguage(browserLanguage);
        console.log(`i18n language changed to: ${browserLanguage}`);
      }

      // プロフィール言語設定を確認・更新（エラーでも継続）
      try {
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.warn('Failed to fetch profile language:', fetchError);
          return;
        }

        if (profile?.language !== browserLanguage) {
          console.log(`Updating profile language from ${profile?.language} to ${browserLanguage}`);
          
          const { error } = await supabase
            .from('profiles')
            .update({ language: browserLanguage })
            .eq('id', userId);

          if (error) {
            console.warn('Failed to update profile language:', error);
          } else {
            console.log('Profile language updated successfully');
          }
        }
      } catch (profileError) {
        console.warn('Error updating profile language:', profileError);
        // プロフィール更新エラーは認証エラーとして扱わない
      }

    } catch (error) {
      console.error('Error in safe language update:', error);
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
          
          // 既にログインしている場合は言語設定を確認（安全に）
          if (session?.user) {
            await safeUpdateLanguage(session.user.id, 'initial');
          }
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
          await safeUpdateLanguage(session.user.id, 'signup');
          
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