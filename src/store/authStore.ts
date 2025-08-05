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
  signUp: (email: string, password: string, username: string, phoneNumber?: string) => Promise<{ user: User | null; error: unknown } | undefined>;
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
  signUp: async (email: string, password: string, username: string, phoneNumber?: string) => {
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
    console.log('SignUp: Phone number provided:', phoneNumber ? 'Yes' : 'No');

    console.log('🔐 Calling Supabase auth.signUp...');
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
    
    // 電話番号が提供されている場合、データベースに保存
    if (phoneNumber && data.user) {
      console.log('📱 Recording phone number for new user...');
      try {
        const { error: phoneError } = await supabase.rpc('record_phone_verification', {
          p_user_id: data.user.id,
          p_phone_number: phoneNumber
        });
        
        if (phoneError) {
          console.error('❌ Phone number recording failed:', phoneError);
          // 電話番号保存失敗はアカウント作成の失敗とはしない（継続可能）
        } else {
          console.log('✅ Phone number successfully recorded for new user');
        }
      } catch (phoneRecordError) {
        console.error('Phone number recording exception:', phoneRecordError);
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