import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<{ user: User | null; error: any } | undefined>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
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
    return { user: data.user, error: null };
  },
  signOut: async () => {
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
  setUser: (user) => set({ user, loading: false }),
}));

// Note: Auth state initialization is handled by AuthProvider component