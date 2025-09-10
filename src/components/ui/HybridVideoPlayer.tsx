import React, { SyntheticEvent } from 'react';
import { SimpleCloudflareIframe } from './SimpleCloudflareIframe';

interface HybridVideoPlayerProps {
  // 新規: Stream Video ID
  streamVideoId?: string;
  // 既存: Supabase Storage URL
  videoUrl?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  // simplified: removed debugTag / SDK readiness logic
}

export const HybridVideoPlayer: React.FC<HybridVideoPlayerProps> = ({
  streamVideoId,
  videoUrl,
  autoplay = false,
  muted = false,
  controls = true,
  className = '',
  onPlay,
  onPause,
  onEnded,
  onError,
}) => {

  // （簡略化版ではライブラリプレイヤーを使わないためエラーコールバック簡素化）

  const handleVideoError = (event: SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video playback error:', event);
    onError?.();
  };

  // Stream video
  if (streamVideoId) {
    // ライブラリ版でモバイル端末のタップ伝播問題が出ているため暫定的に iframe 直埋め版を使用
    return (
      <SimpleCloudflareIframe
        videoId={streamVideoId}
        autoplay={false}
        muted={false}
        controls={controls}
        className={className}
      />
    );
    // 元の実装（問題解消後に戻す場合）
    // return (
    //   <StreamVideoPlayer
    //     videoId={streamVideoId}
    //     autoplay={autoplay}
    //     muted={muted}
    //     controls={controls}
    //     className={className}
    //     onPlay={onPlay}
    //     onPause={onPause}
    //     onEnded={onEnded}
    //     onError={handleStreamError}
    //   />
    // );
  }

  // 既存動画: HTML5 video使用
  if (videoUrl && videoUrl.includes('supabase.co/storage')) {
    return (
      <video
        src={videoUrl}
        controls={controls}
        autoPlay={autoplay}
        muted={muted}
        className={className}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onError={handleVideoError}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  // フォールバック
  return (
    <div className={`flex items-center justify-center bg-gray-900 ${className}`}>
      <p className="text-white">動画が見つかりません</p>
    </div>
  );
};
