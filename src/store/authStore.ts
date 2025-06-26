import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { trackBeatNexusEvents, setUserProperties, clearUserProperties } from '../utils/analytics';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<{ user: User | null; error: any } | undefined>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setUserFromAuth: (user: User | null) => void; // AuthProvider用
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  signIn: async (email: string, password: string, rememberMe = true) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    // Note: ログインイベントはsetUserで適切に発火される
  },
  signUp: async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
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
    set({ user, loading: false });
    
    // AuthProviderからの呼び出し（セッション復元など）
    if (user) {
      // ログインイベントなしでUser IDのみ設定
      setUserProperties(user.id, false);
    }
  },
}));

// Note: Auth state initialization is handled by AuthProvider component