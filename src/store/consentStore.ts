import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// バージョンを変更すると古い同意は再取得される
const CONSENT_SCHEMA_VERSION = 1;

export type ConsentCategory = 'essential' | 'analytics' | 'ads';

interface ConsentPreferences {
  essential: boolean; // 常に true (必須)
  analytics: boolean;
  ads: boolean; // まだ広告未導入なら既定 false
}

interface ConsentState {
  version: number;
  preferences: ConsentPreferences;
  open: boolean; // バナー/設定表示
  lastUpdated?: string; // ISO timestamp
  hasAnswered: boolean; // ユーザーが一度何らかの選択/保存を行ったか
  acceptAll: () => void;
  rejectAll: () => void;
  setPreferences: (prefs: Partial<Omit<ConsentPreferences, 'essential'>>) => void;
  openManager: () => void;
  closeManager: () => void;
  needsRenewal: boolean;
  resetForNewVersion: () => void;
}

const defaultPrefs: ConsentPreferences = {
  essential: true,
  analytics: false,
  ads: false,
};

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      version: CONSENT_SCHEMA_VERSION,
      preferences: defaultPrefs,
      open: true, // 初回表示
      hasAnswered: false,
      needsRenewal: false,
      acceptAll: () => set({ preferences: { essential: true, analytics: true, ads: true }, open: false, hasAnswered: true, lastUpdated: new Date().toISOString() }),
      rejectAll: () => set({ preferences: { essential: true, analytics: false, ads: false }, open: false, hasAnswered: true, lastUpdated: new Date().toISOString() }),
      setPreferences: (prefs) => set({ preferences: { ...get().preferences, ...prefs, essential: true }, lastUpdated: new Date().toISOString() }),
      openManager: () => set({ open: true }),
      closeManager: () => set({ open: false, hasAnswered: true }),
      resetForNewVersion: () => set({ preferences: defaultPrefs, open: true, needsRenewal: false, version: CONSENT_SCHEMA_VERSION }),
    }),
    {
      name: 'beatnexus-consent',
      partialize: (state) => ({ version: state.version, preferences: state.preferences, lastUpdated: state.lastUpdated, hasAnswered: state.hasAnswered }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.version !== CONSENT_SCHEMA_VERSION) {
          // スキーマ変更で再同意
          (state as ConsentState).needsRenewal = true;
          (state as ConsentState).open = true;
        }
        // 旧データ互換: analytics が true なら既に回答済みとみなす
        if (!(state as ConsentState).hasAnswered) {
          if (state.preferences.analytics) {
            (state as ConsentState).hasAnswered = true;
            (state as ConsentState).open = false;
          } else {
            // analytics=false でデフォルトと同値の場合は未回答の可能性 → open維持
            // ただし lastUpdated があれば回答済みとみなして閉じる
            if (state.lastUpdated) {
              (state as ConsentState).hasAnswered = true;
              (state as ConsentState).open = false;
            }
          }
        } else {
          // hasAnswered が true ならバナーを閉じる
          (state as ConsentState).open = false;
        }
      },
    }
  )
);

export const hasAnalyticsConsent = () => useConsentStore.getState().preferences.analytics;
export const hasAdsConsent = () => useConsentStore.getState().preferences.ads;
