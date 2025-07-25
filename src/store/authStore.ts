import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { trackBeatNexusEvents, setUserProperties, clearUserProperties } from '../utils/analytics';
import { detectBrowserLanguage } from '../lib/utils';
import i18n from '../i18n';

interface AuthState {
  user: User | null;
  loading: boolean;
  isUserInitiatedLogin?: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<{ user: User | null; error: any } | undefined>;
  validatePreregistration: (email: string) => Promise<boolean>;
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
  validatePreregistration: async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-preregistration', {
        body: { email: email.toLowerCase().trim() }
      });

      if (error) {
        console.error('Preregistration validation error:', error);
        return false;
      }

      return data?.isRegistered || false;
    } catch (error) {
      console.error('Preregistration validation failed:', error);
      return false;
    }
  },
  signUp: async (email: string, password: string, username: string) => {
    // Check if email is pre-registered
    const isPreregistered = await (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('validate-preregistration', {
          body: { email: email.toLowerCase().trim() }
        });
        
        if (error) throw error;
        return data?.isRegistered || false;
             } catch (error) {
         console.error('Pre-registration check failed:', error);
         throw new Error(i18n.t('auth.error.preregistrationCheckFailed'));
       }
     })();

     if (!isPreregistered) {
       throw new Error(i18n.t('auth.error.emailNotPreregistered'));
     }

    // ブラウザの言語設定を検出
    const detectedLanguage = detectBrowserLanguage();
    console.log('SignUp: Detected browser language:', detectedLanguage);

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
    if (error) throw error;
    
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