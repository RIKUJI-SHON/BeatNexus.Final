import { create } from 'zustand';

interface ProfileSettingsModalState {
  isOpen: boolean;
  source: 'profile-page' | 'onboarding' | null;
  onUpdateCallback: (() => void) | null;
  onSaveCallback: (() => void) | null;
  
  openModal: (source: 'profile-page' | 'onboarding', onUpdate?: () => void, onSave?: () => void) => void;
  closeModal: () => void;
}

export const useProfileSettingsModalStore = create<ProfileSettingsModalState>((set) => ({
  isOpen: false,
  source: null,
  onUpdateCallback: null,
  onSaveCallback: null,
  
  openModal: (source, onUpdate, onSave) => {
    console.log('[ProfileSettingsModalStore] Opening modal from:', source);
    set({
      isOpen: true,
      source,
      onUpdateCallback: onUpdate || null,
      onSaveCallback: onSave || null,
    });
  },
  
  closeModal: () => {
    console.log('[ProfileSettingsModalStore] Closing modal');
    set({
      isOpen: false,
      source: null,
      onUpdateCallback: null,
      onSaveCallback: null,
    });
  },
}));
