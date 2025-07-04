import { create } from 'zustand';
import { BattleMatchedData } from '../components/ui/BattleMatchedModal';

interface BattleMatchedState {
  pendingMatch: BattleMatchedData | null;
  isModalOpen: boolean;
  setPendingMatch: (match: BattleMatchedData | null) => void;
  showMatchModal: (match: BattleMatchedData) => void;
  closeMatchModal: () => void;
}

export const useBattleMatchedStore = create<BattleMatchedState>((set) => ({
  pendingMatch: null,
  isModalOpen: false,

  setPendingMatch: (match) => {
    console.log('⚡ [BattleMatchedStore] setPendingMatch called with:', match);
    set({ pendingMatch: match });
  },

  showMatchModal: (match: BattleMatchedData) => {
    console.log('⚡ [BattleMatchedStore] showMatchModal called with data:', match);
    set({
      pendingMatch: match,
      isModalOpen: true,
    });
  },

  closeMatchModal: () => {
    console.log('⚡ [BattleMatchedStore] closeMatchModal called');
    set({
      pendingMatch: null,
      isModalOpen: false,
    });
  },
})); 