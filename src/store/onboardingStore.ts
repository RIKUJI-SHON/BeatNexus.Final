import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  isOnboardingModalOpen: boolean;
  currentSlide: number;
  setHasSeenOnboarding: (seen: boolean) => void;
  setOnboardingModalOpen: (isOpen: boolean) => void;
  setCurrentSlide: (slide: number) => void;
  nextSlide: () => void;
  previousSlide: () => void;
  resetOnboarding: () => void;
  shouldShowOnboarding: () => boolean;
  checkOnboardingStatus: (userId: string) => Promise<boolean>;
  completeOnboarding: (userId: string) => Promise<void>;
  triggerOnboardingForNewUser: (userId: string) => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasSeenOnboarding: false,
      isOnboardingModalOpen: false,
      currentSlide: 0,
      
      setHasSeenOnboarding: (seen: boolean) => 
        set({ hasSeenOnboarding: seen }),
      
      setOnboardingModalOpen: (isOpen: boolean) => {
        set({ isOnboardingModalOpen: isOpen });
        if (isOpen) {
          set({ currentSlide: 0 });
        }
      },
      
      setCurrentSlide: (slide: number) => 
        set({ currentSlide: slide }),
      
      nextSlide: () => {
        const { currentSlide } = get();
        if (currentSlide < 4) { // 4スライド目まで対応（0-4で5スライド）
          set({ currentSlide: currentSlide + 1 });
        }
      },
      
      previousSlide: () => {
        const { currentSlide } = get();
        if (currentSlide > 0) {
          set({ currentSlide: currentSlide - 1 });
        }
      },
      
      resetOnboarding: () => {
        set({ 
          hasSeenOnboarding: false,
          isOnboardingModalOpen: false,
          currentSlide: 0 
        });
      },
      
      shouldShowOnboarding: () => {
        const { hasSeenOnboarding } = get();
        return !hasSeenOnboarding;
      },

      // Supabaseからオンボーディング状況を確認
      checkOnboardingStatus: async (userId: string): Promise<boolean> => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('has_seen_onboarding')
            .eq('id', userId)
            .single();

          if (error) {
            console.error('オンボーディング状況の確認に失敗:', error);
            return true; // エラー時はオンボーディング完了とみなす
          }

          const hasSeenOnboarding = data?.has_seen_onboarding ?? true;
          set({ hasSeenOnboarding });
          return hasSeenOnboarding;
        } catch (error) {
          console.error('オンボーディング状況確認エラー:', error);
          return true;
        }
      },

      // オンボーディング完了をデータベースに保存
      completeOnboarding: async (userId: string): Promise<void> => {
        try {
          const { error } = await supabase.rpc('update_onboarding_status', {
            p_user_id: userId,
            p_has_seen_onboarding: true
          });

          if (error) {
            console.error('オンボーディング完了の保存に失敗:', error);
            throw error;
          }

          set({ 
            hasSeenOnboarding: true,
            isOnboardingModalOpen: false 
          });
          
          console.log('オンボーディング完了をデータベースに保存しました');
        } catch (error) {
          console.error('オンボーディング完了保存エラー:', error);
          // エラーが発生してもローカル状態は更新
          set({ 
            hasSeenOnboarding: true,
            isOnboardingModalOpen: false 
          });
        }
      },

      // 新規ユーザー向けオンボーディングトリガー
      triggerOnboardingForNewUser: async (userId: string): Promise<void> => {
        try {
          const hasSeenOnboarding = await get().checkOnboardingStatus(userId);
          
          if (!hasSeenOnboarding) {
            console.log('新規ユーザーにオンボーディングを表示します');
            set({ 
              isOnboardingModalOpen: true,
              currentSlide: 0,
              hasSeenOnboarding: false
            });
          } else {
            console.log('このユーザーはすでにオンボーディングを完了しています');
          }
        } catch (error) {
          console.error('新規ユーザーオンボーディングトリガーエラー:', error);
        }
      }
    }),
    {
      name: 'beatnexus-onboarding',
      partialize: (state) => ({ 
        hasSeenOnboarding: state.hasSeenOnboarding 
      }),
    }
  )
); 