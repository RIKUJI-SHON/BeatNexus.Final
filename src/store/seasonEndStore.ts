import { create } from 'zustand';

export interface SeasonEndResultPayload {
  seasonId: string;
  seasonName?: string | null;
  seasonStartAt?: string | null;
  seasonEndAt?: string | null;
  // Player ranking (battle)
  playerRank?: number | null;
  playerPoints?: number | null;
  // Voter ranking
  voterRank?: number | null;
  voterPoints?: number | null;
}

interface SeasonEndState {
  isModalOpen: boolean;
  result: SeasonEndResultPayload | null;
  showSeasonEndModal: (payload: SeasonEndResultPayload) => void;
  closeSeasonEndModal: () => void;
}

export const useSeasonEndStore = create<SeasonEndState>((set) => ({
  isModalOpen: false,
  result: null,
  showSeasonEndModal: (payload) => set({ isModalOpen: true, result: payload }),
  closeSeasonEndModal: () => set({ isModalOpen: false, result: null }),
}));
