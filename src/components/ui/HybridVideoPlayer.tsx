import React, { SyntheticEvent } from 'react';
import { StreamVideoPlayer } from './StreamVideoPlayer';

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

  const handleStreamError = (event: Event) => {
    console.error('Stream playback error:', event);
    onError?.();
  };

  const handleVideoError = (event: SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video playback error:', event);
    onError?.();
  };

  // 新規動画: Stream Player使用
  if (streamVideoId) {
    return (
      <StreamVideoPlayer
        videoId={streamVideoId}
        autoplay={autoplay}
        muted={muted}
        controls={controls}
        className={className}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onError={handleStreamError}
        debug={import.meta.env.VITE_DEBUG_STREAM === 'true'}
      />
    );
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
