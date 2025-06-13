import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { setUser } = useAuthStore();

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

  // 新規ユーザーの言語設定を行う関数（プロフィール + メタデータ）
  const setNewUserLanguage = async (userId: string) => {
    try {
      const browserLanguage = detectBrowserLanguage();
      console.log(`Setting language for new user ${userId}: ${browserLanguage}`);

      // 1. プロフィールテーブルの言語設定
      const response = await fetch('/functions/v1/set-user-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          browser_language: navigator.language
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Profile language set successfully:', result);

      // 2. auth.usersのraw_user_meta_dataにも言語情報を保存（認証メール用）
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          language: browserLanguage,
          language_full: browserLanguage === 'ja' ? 'Japanese' : 'English',
          browser_language: navigator.language
        }
      });

      if (metaError) {
        console.error('Failed to update user metadata:', metaError);
      } else {
        console.log('User metadata updated with language info');
      }

    } catch (error) {
      console.error('Failed to set user language:', error);
      // エラーが発生してもユーザー体験を阻害しないよう、ログのみ出力
    }
  };

  useEffect(() => {
    // 初期セッションを取得
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting initial session:', error);
        setUser(null);
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);

        // 新規ユーザー登録時にブラウザ言語を設定
        if (event === 'SIGNED_UP' && session?.user) {
          console.log('New user signed up, setting browser language...');
          await setNewUserLanguage(session.user.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  return <>{children}</>;
}; 