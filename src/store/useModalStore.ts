import { create } from 'zustand';

interface ModalState {
  isNewSeasonModalOpen: boolean;
  openNewSeasonModal: () => void;
  closeNewSeasonModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isNewSeasonModalOpen: false,
  openNewSeasonModal: () => set({ isNewSeasonModalOpen: true }),
  closeNewSeasonModal: () => set({ isNewSeasonModalOpen: false }),
}));
