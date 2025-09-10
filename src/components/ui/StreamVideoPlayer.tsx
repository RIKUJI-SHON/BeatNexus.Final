import React from 'react';
import { Stream } from '@cloudflare/stream-react';

interface StreamVideoPlayerProps {
  videoId: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  poster?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (event: Event) => void;
  className?: string;
}

export const StreamVideoPlayer: React.FC<StreamVideoPlayerProps> = ({
  videoId,
  autoplay = false,
  muted = false,
  controls = true,
  loop = false,
  poster,
  onPlay,
  onPause,
  onEnded,
  onError,
  className = '',
}) => {
  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className}`}>
        <p className="text-white">動画が見つかりません</p>
      </div>
    );
  }
  return (
    <div className={className} data-video-id={videoId}>
      <Stream
        key={videoId}
        src={videoId}
        controls={controls}
        autoplay={autoplay}
        muted={muted}
        loop={loop}
        poster={poster}
        responsive
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onError={onError}
      />
    </div>
  );
};
