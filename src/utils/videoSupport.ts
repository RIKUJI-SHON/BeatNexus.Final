/**
 * iOS動画再生問題対応 - 動画サポートユーティリティ
 * 作成日: 2025-01-08
 * 目的: iOS Safariでの動画再生制限に対応するためのヘルパー関数
 * 
 * Phase 1.5追加: より積極的なiOS制限対応
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
 * iOS環境全体を検出する関数（すべてのiOSブラウザ）
 * @returns iOSデバイスの場合はtrue、それ以外はfalse
 */
export const isIOSDevice = (): boolean => {
  // サーバーサイドレンダリング対応
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent;
  return !!ua.match(/iPad/i) || !!ua.match(/iPhone/i) || !!ua.match(/iPod/i);
};

/**
 * iOS用の動画属性を取得する関数
 * @returns iOS Safari用の動画属性オブジェクト
 */
export const getIOSVideoProps = () => {
  if (!isIOSDevice()) return {};
  
  return {
    playsInline: true,
    'webkit-playsinline': 'true',
    preload: 'none' as const,
    muted: true, // iOS制限回避のため初期ミュート
  };
};

/**
 * デバイス別の動画preload設定を取得
 * @returns 適切なpreload値
 */
export const getOptimalPreloadSetting = (): 'none' | 'metadata' | 'auto' => {
  if (isIOSDevice()) {
    return 'none'; // iOS全体で複数動画の同時preloadを避ける
  }
  return 'metadata'; // その他のデバイスではメタデータを事前読み込み
};

/**
 * iOS環境での動画読み込み戦略
 * @param isSecondVideo 2つ目の動画かどうか
 * @returns 読み込み戦略
 */
export const getIOSLoadingStrategy = (isSecondVideo: boolean = false) => {
  if (!isIOSDevice()) {
    return { shouldLoad: true, requiresUserAction: false };
  }
  
  return {
    shouldLoad: !isSecondVideo, // iOSでは最初の動画のみ自動読み込み
    requiresUserAction: isSecondVideo, // 2つ目の動画はユーザー操作が必要
    preload: 'none' as const,
    muted: true,
  };
};

/**
 * 動画要素の遅延読み込み制御
 * @param videoElement HTML video要素
 * @param isSecondVideo 2つ目の動画かどうか
 */
export const setupIOSVideoLoading = (
  videoElement: HTMLVideoElement,
  isSecondVideo: boolean = false
) => {
  if (!isIOSDevice()) return;
  
  if (isSecondVideo) {
    // 2つ目の動画は明示的なユーザー操作まで読み込みを延期
    videoElement.preload = 'none';
    
    // プレースホルダー表示用のポスター設定
    if (!videoElement.poster) {
      videoElement.poster = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuOCv+ODg+ODl+OBl+OBpuiqreOBv+i+vOOBv+OBvuOBmTwvdGV4dD48L3N2Zz4=';
    }
  }
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
