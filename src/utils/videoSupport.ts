/**
 * iOS動画再生問題対応 - 動画サポートユーティリティ
 * 作成日: 2025-01-08
 * 目的: iOS Safariでの動画再生制限に対応するためのヘルパー関数
 */

/**
 * iOS Safariを検出する関数
 * @returns iOS Safariの場合はtrue、それ以外はfalse
 */
export const isIOSSafari = (): boolean => {
  // サーバーサイドレンダリング対応
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  const webkit = !!ua.match(/WebKit/i);
  // Chrome iOS版（CriOS）を除外してSafariのみを検出
  const iOSSafari = iOS && webkit && !ua.match(/CriOS/i);
  
  return iOSSafari;
};

/**
 * iOS用の動画属性を取得する関数
 * @returns iOS Safari用の動画属性オブジェクト
 */
export const getIOSVideoProps = () => {
  if (!isIOSSafari()) return {};
  
  return {
    playsInline: true,
    'webkit-playsinline': 'true',
    preload: 'none' as const,
  };
};

/**
 * デバイス別の動画preload設定を取得
 * @returns 適切なpreload値
 */
export const getOptimalPreloadSetting = (): 'none' | 'metadata' | 'auto' => {
  if (isIOSSafari()) {
    return 'none'; // iOS Safariでは複数動画の同時preloadを避ける
  }
  return 'metadata'; // その他のデバイスではメタデータを事前読み込み
};

/**
 * iOS Safari用の動画属性をまとめて取得
 * @returns 統合された動画属性
 */
export const getVideoAttributes = () => {
  const iosProps = getIOSVideoProps();
  const preload = getOptimalPreloadSetting();
  
  return {
    ...iosProps,
    preload,
  };
};

/**
 * 動画URL形式の検証（将来の拡張用）
 * @param url 動画URL
 * @returns 有効なURLの場合はtrue
 */
export const isValidVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  // 基本的なURL形式チェック
  try {
    new URL(url);
  } catch {
    return false;
  }
  
  // 動画ファイル拡張子のチェック
  const videoExtensions = /\.(mp4|webm|mov|m4v)$/i;
  return videoExtensions.test(url) || url.includes('blob:');
};
