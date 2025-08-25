/**
 * Feature Flags Hook
 * 機能フラグを管理するカスタムフック
 */

export const useFeatureFlags = () => {
  // SuperTip機能の有効/無効を制御
  const isSuperTipEnabled = import.meta.env.VITE_ENABLE_SUPER_TIP === 'true';
  
  // その他の機能フラグも今後追加可能
  const isPushNotificationEnabled = import.meta.env.VITE_ENABLE_PUSH_NOTIFICATION !== 'false';
  const isRealtimeEnabled = import.meta.env.VITE_ENABLE_REALTIME !== 'false';
  
  return {
    isSuperTipEnabled,
    isPushNotificationEnabled,
    isRealtimeEnabled,
  };
};

// 環境判定ユーティリティ
export const isProduction = () => import.meta.env.PROD;
export const isDevelopment = () => import.meta.env.DEV;

// デバッグ用ログ（本番環境では無効）
export const debugLog = (message: string, data?: unknown) => {
  if (isDevelopment()) {
    console.log(`[DEBUG] ${message}`, data);
  }
};
