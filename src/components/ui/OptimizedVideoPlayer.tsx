import React, { useState, useCallback, useRef } from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isIOSDevice } from '../../utils/videoSupport';

interface VideoErrorInfo {
  playerName: string;
  url: string | undefined;
  error: string;
  isIOSDevice: boolean;
  isSecondVideo: boolean;
}

interface OptimizedVideoPlayerProps {
  videoUrl: string | undefined;
  className?: string;
  playerName?: string;
  onError?: (errorInfo: VideoErrorInfo) => void;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  isSecondVideo?: boolean; // iOS環境での動画読み込み制御用
}

export const OptimizedVideoPlayer: React.FC<OptimizedVideoPlayerProps> = ({
  videoUrl,
  className = '',
  playerName = 'プレーヤー',
  onError,
  poster,
  autoPlay = false,
  muted = false,
  controls = true,
  preload = 'metadata',
  isSecondVideo = false
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  
  // iOS環境かつ2つ目の動画の場合の制御
  const shouldShowPlaceholder = isIOSDevice() && isSecondVideo && !userInteracted;

  // 動画読み込み戦略の決定
  const getVideoPreloadSetting = useCallback(() => {
    if (isIOSDevice()) {
      if (isSecondVideo && !userInteracted) {
        return 'none'; // 2つ目の動画はユーザー操作まで読み込まない
      }
      return 'none'; // iOS全体でpreloadを最小化
    }
    return preload;
  }, [isSecondVideo, userInteracted, preload]);

  // エラーハンドリング
  const handleVideoError = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error(`❌ Video error for ${playerName}:`, event);
    setHasError(true);
    
    const errorInfo = {
      playerName,
      url: videoUrl,
      error: 'Video loading failed',
      isIOSDevice: isIOSDevice(),
      isSecondVideo
    };
    
    onError?.(errorInfo);
  }, [playerName, videoUrl, onError, isSecondVideo]);

  // 動画読み込み成功
  const handleVideoLoad = useCallback(() => {
    console.log(`✅ Video loaded successfully for ${playerName}`);
    setHasError(false);
  }, [playerName]);

  // iOS用プレースホルダーのクリックハンドラー
  const handlePlaceholderClick = useCallback(() => {
    console.log(`🎬 User triggered video load for ${playerName}`);
    setUserInteracted(true);
  }, [playerName]);

  // レンダリング
  if (shouldShowPlaceholder) {
    return (
      <div 
        className={`w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900 cursor-pointer hover:bg-gradient-to-br hover:from-gray-700 hover:to-gray-800 transition-all ${className}`}
        onClick={handlePlaceholderClick}
      >
        <Play className="h-16 w-16 mb-3 opacity-70 hover:opacity-100 transition-opacity" />
        <p className="text-sm text-center px-4 mb-2">
          {playerName}の動画を読み込む
        </p>
        <p className="text-xs text-center px-4 text-gray-500">
          タップして動画を読み込み
        </p>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900 ${className}`}>
        <Play className="h-16 w-16 mb-3 opacity-50" />
        <p className="text-sm text-center px-4">
          {t('battleView.videoLoading')}
        </p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900 ${className}`}>
        <AlertTriangle className="h-16 w-16 mb-3 opacity-50" />
        <p className="text-sm text-center px-4">
          {t('battleReplay.videoError')}
        </p>
        <p className="text-xs text-center px-4 mt-2 opacity-70">
          {isIOSDevice() ? 
            'iOS環境では一部の動画形式がサポートされていない可能性があります' :
            '動画の読み込みに失敗しました'
          }
        </p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      className={`w-full h-full object-contain ${className}`}
      controls={controls}
      preload={getVideoPreloadSetting()}
      poster={poster}
      autoPlay={autoPlay}
      muted={muted || isIOSDevice()} // iOS環境では初期ミュート
      playsInline
      webkit-playsinline="true"
      onError={handleVideoError}
      onLoadedData={handleVideoLoad}
    >
      <source src={videoUrl} type="video/mp4" />
      <source src={videoUrl} type="video/webm" />
      {t('battleReplay.videoNotSupported')}
    </video>
  );
};

export default OptimizedVideoPlayer;
