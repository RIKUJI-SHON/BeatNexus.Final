import { create } from 'zustand';
import { Reward } from '../types/rewards';
import { useAuthStore } from './authStore';

interface RewardEarnedState {
  isOpen: boolean;
  reward: Reward | null;
  open: (reward: Reward) => void;
  close: () => void;
  goToCollection: () => void;
}

export const useRewardEarnedStore = create<RewardEarnedState>((set) => ({
  isOpen: false,
  reward: null,
  open: (reward) => set({ isOpen: true, reward }),
  close: () => set({ isOpen: false, reward: null }),
  goToCollection: () => {
    const { user } = useAuthStore.getState();
    const userId = user?.id ?? 'me';
    // ルートにクエリパラメータでcollectionタブへ
    window.location.href = `/profile/${userId}?tab=collection`;
    set({ isOpen: false, reward: null });
  }
}));
