import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { trackBeatNexusEvents, setUserProperties, clearUserProperties } from '../utils/analytics';
import { detectBrowserLanguage } from '../lib/utils';

interface AuthState {
  user: User | null;
  loading: boolean;
  isUserInitiatedLogin?: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, phoneNumber?: string) => Promise<{ user: User | null; error: unknown } | undefined>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setUserFromAuth: (user: User | null) => void; // AuthProvider用
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  isUserInitiatedLogin: false,
  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    // ログインアクションを実行したことをマーク
    set({ isUserInitiatedLogin: true });
  },
  signUp: async (email: string, password: string, username: string, phoneNumber?: string) => {
    // 事前登録チェックを削除 - 一般リリース対応
    // (validate-preregistration Edge Functionは保持、pre_registered_usersテーブルも保持)

    // ブラウザの言語設定を検出
    const detectedLanguage = detectBrowserLanguage();
    console.log('SignUp: Detected browser language:', detectedLanguage);
    console.log('SignUp: Phone number provided:', phoneNumber ? 'Yes' : 'No');

    console.log('� Debug - Environment check:');
    console.log('🔧 VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('🔧 Expected dev URL: https://wdttluticnlqzmqmfvgt.supabase.co');
    console.log('🔧 Expected prod URL: https://qgqcjtjxaoplhxurbpis.supabase.co');

    console.log('�🔐 Calling Supabase auth.signUp...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          language: detectedLanguage, // ブラウザ言語をメタデータに追加
        },
      },
    });
    
    console.log('📊 Supabase signUp response:', { 
      data: !!data, 
      error: !!error,
      user: !!data?.user,
      session: !!data?.session,
      email_confirmed_at: data?.user?.email_confirmed_at 
    });
    
    if (error) {
      console.error('❌ Supabase signUp error:', error);
      throw error;
    }

    // メール認証の状態を強制チェック
    if (data?.user) {
      console.log('✅ User created successfully');
      console.log('📧 Email confirmed at:', data.user.email_confirmed_at);
      
      if (data.user.email_confirmed_at) {
        console.log('⚠️  WARNING: Email was automatically confirmed! Check Supabase settings.');
        console.log('⚠️  Expected: email_confirmed_at should be null for email confirmation flow');
      } else {
        console.log('✅ Email confirmation required - this is correct behavior');
      }
    }
    
    console.log('✅ Supabase signUp successful, user ID:', data.user?.id);
    
    // 電話番号を一時的にlocalStorageに保存（メール認証後にデータベースに保存）
    if (phoneNumber && data.user) {
      console.log('📱 Storing phone number temporarily for email confirmation...');
      try {
        localStorage.setItem('pending_phone_verification', JSON.stringify({
          userId: data.user.id,
          phoneNumber: phoneNumber,
          timestamp: Date.now()
        }));
        console.log('✅ Phone number temporarily stored for user:', data.user.id);
      } catch (storageError) {
        console.error('❌ Failed to store phone number temporarily:', storageError);
      }
    }
    
    // Track registration event
    trackBeatNexusEvents.userRegister();
    
    return { user: data.user, error: null };
  },
  signOut: async () => {
    // Track logout event before clearing state
    trackBeatNexusEvents.userLogout();
    
    // Clear User ID from analytics
    clearUserProperties();
    
    // Clear local state first
    set({ user: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      // Even if there's an error clearing the remote session,
      // we've already cleared the local state
      console.warn('Error clearing remote session:', error);
    }
  },
  setUser: (user) => {
    set({ user, loading: false });
    
    // Set user properties for analytics (if user exists)
    if (user) {
      // 実際のログインアクションでのUser ID設定（ログインイベント付き）
      setUserProperties(user.id, true);
    }
  },
  setUserFromAuth: (user) => {
    const state = useAuthStore.getState();
    const isUserLogin = state.isUserInitiatedLogin;
    
    set({ user, loading: false, isUserInitiatedLogin: false });
    
    // AuthProviderからの呼び出し（セッション復元など）
    if (user) {
      // ユーザー主導のログインの場合はログインイベント付きで設定
      setUserProperties(user.id, isUserLogin);
    }
  },
}));

// Note: Auth state initialization is handled by AuthProvider component