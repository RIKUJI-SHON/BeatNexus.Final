import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        if (currentSlide < 3) {
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