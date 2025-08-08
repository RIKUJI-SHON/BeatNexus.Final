import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isIOSDevice } from '../../utils/videoSupport';
import { singleActiveVideo } from '../../utils/singleActiveVideo';

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
  const [hasRetried, setHasRetried] = useState(false);
  const [isAttached, setIsAttached] = useState(true);
  const instanceIdRef = useRef<string>(Math.random().toString(36).slice(2));

  // iOS環境かつ2つ目の動画の場合の制御
  const shouldShowPlaceholder = isIOSDevice() && isSecondVideo && !userInteracted;
  // BはiOSで必ずプレースホルダー先行（初回エラー回避）
  const isIOSBHardGuard = isIOSDevice() && isSecondVideo && !userInteracted;

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

  // 単一アクティブ動画: 他からのアクティブ化イベントを受けたら自分をデタッチ
  useEffect(() => {
    const onActivate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string };
      if (detail?.id !== instanceIdRef.current) {
        const v = videoRef.current;
        if (v) {
          try {
            v.pause();
            v.removeAttribute('src');
            v.load(); // デコーダ解放
            setIsAttached(false);
            console.log('🔌 Video detached to keep single active instance');
          } catch {
            // ignore
          }
        }
      }
    };

    window.addEventListener('BNX_VIDEO_ACTIVATE', onActivate as EventListener);
    return () => {
      window.removeEventListener('BNX_VIDEO_ACTIVATE', onActivate as EventListener);
    };
  }, []);

  const reattachAndPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    try {
      v.src = videoUrl;
      await v.load();
      await v.play().catch(() => {});
      setIsAttached(true);
      singleActiveVideo.activate(instanceIdRef.current);
    } catch (e) {
      console.warn('Failed to reattach/play:', e);
    }
  }, [videoUrl]);

  // エラーハンドリング
  const handleVideoError = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error(`❌ Video error for ${playerName}:`, event);
    setHasError(true);
    // リトライ（1回）
    if (!hasRetried && videoRef.current) {
      setHasRetried(true);
      const retryDelay = isIOSDevice() ? 600 : 300;
      setTimeout(() => {
        const v = videoRef.current!;
        try {
          v.pause();
          // 強制再読み込み
          const currentSrc = v.currentSrc || v.src || videoUrl || '';
          v.removeAttribute('src');
          v.load();
          if (currentSrc) v.src = currentSrc;
          v.load();
          v.play().catch(() => {});
          setHasError(false);
          console.log('🔁 Retried video load once');
        } catch (e) {
          console.warn('Retry failed:', e);
        }
      }, retryDelay);
    }
    
    const errorInfo = {
      playerName,
      url: videoUrl,
      error: 'Video loading failed',
      isIOSDevice: isIOSDevice(),
      isSecondVideo
    };
    onError?.(errorInfo);
  }, [playerName, videoUrl, onError, isSecondVideo, hasRetried]);

  // 自分が再生開始したら単一アクティブ宣言
  const onPlayHandler = useCallback(() => {
    singleActiveVideo.activate(instanceIdRef.current);
  }, []);

  // iOSプレースホルダークリックで読み込み→再生
  const handlePlaceholderClick = useCallback(() => {
    console.log(`🎬 User triggered video load for ${playerName}`);
    setUserInteracted(true);
    if (!isAttached) {
      reattachAndPlay();
    }
  }, [playerName, isAttached, reattachAndPlay]);

  // URLからMIMEを推定
  const guessMimeFromUrl = (url?: string) => {
    if (!url) return undefined;
    try {
      const noQuery = url.split('?')[0].toLowerCase();
      if (noQuery.endsWith('.mp4')) return 'video/mp4';
      if (noQuery.endsWith('.webm')) return 'video/webm';
      if (noQuery.endsWith('.mov')) return 'video/quicktime';
      if (noQuery.endsWith('.m4v')) return 'video/x-m4v';
    } catch {}
    return undefined;
  };

  // レンダリング
  if (shouldShowPlaceholder || isIOSBHardGuard) {
    return (
      <div 
        className={`w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900 cursor-pointer hover:bg-gradient-to-br hover:from-gray-700 hover:to-gray-800 transition-all ${className}`}
        onClick={handlePlaceholderClick}
      >
        <Play className="h-16 w-16 mb-3 opacity-70 hover:opacity-100 transition-opacity" />
        <p className="text-sm text-center px-4 mb-2">
          {playerName}の動画を読み込む（iOS）
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
    // 失敗時リンク（UI変更なしで下部に情報表示を追加）
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900 ${className}`}>
        <AlertTriangle className="h-16 w-16 mb-3 opacity-50" />
        <p className="text-sm text-center px-4">
          {t('battleReplay.videoError')}
        </p>
        <p className="text-xs text-center px-4 mt-3">
          <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="underline">別ページで再生</a>
        </p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={isAttached ? videoUrl : undefined}
      className={`w-full h-full object-contain ${className}`}
      controls={controls}
      preload={getVideoPreloadSetting()}
      poster={poster}
      autoPlay={autoPlay}
      muted={muted || isIOSDevice()}
      playsInline
      webkit-playsinline="true"
      onError={handleVideoError}
      onLoadedData={() => setHasError(false)}
      onPlay={onPlayHandler}
    >
      {/* typeミスマッチ回避のため、必要な場合のみsourceを1つだけ出す */}
      {(() => {
        const mime = guessMimeFromUrl(videoUrl);
        if (mime) {
          return <source src={videoUrl} type={mime} />;
        }
        return <source src={videoUrl} />;
      })()}
      {t('battleReplay.videoNotSupported')}
    </video>
  );
};

export default OptimizedVideoPlayer;
