import { create } from 'zustand';

export interface BattleResult {
  battleId: string;
  isWin: boolean;
  ratingChange: number;
  newRating: number;
  newRank: string;
  opponentUsername: string;
  battleFormat: string;
}

interface BattleResultState {
  pendingResult: BattleResult | null;
  isModalOpen: boolean;
  setPendingResult: (result: BattleResult | null) => void;
  showResultModal: (result: BattleResult) => void;
  closeResultModal: () => void;
}

export const useBattleResultStore = create<BattleResultState>((set) => ({
  pendingResult: null,
  isModalOpen: false,
  setPendingResult: (result) => set({ pendingResult: result }),
  showResultModal: (result) => set({ pendingResult: result, isModalOpen: true }),
  closeResultModal: () => set({ pendingResult: null, isModalOpen: false }),
})); 