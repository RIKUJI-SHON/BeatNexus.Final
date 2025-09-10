import React, { useEffect, useRef } from 'react';
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
  debug?: boolean; // optional debug logging
  debugTag?: string; // 'A' | 'B' etc.
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
  debug = false,
  debugTag,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!debug) return;
    // 遅延して DOM を観測しコントロールが初期化されたか確認
    const log = (phase: string) => {
      const el = wrapperRef.current;
      if (!el) return;
      const iframe = el.querySelector('iframe');
      console.debug('[StreamVideoPlayer][debug]', phase, {
        videoId,
        hasIframe: !!iframe,
        iframeSize: iframe ? { w: iframe.clientWidth, h: iframe.clientHeight } : null,
        children: el.childNodes.length
      });
    };
    log('mount');
    const t1 = setTimeout(() => log('t+500ms'), 500);
    const t2 = setTimeout(() => log('t+1500ms'), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [debug, videoId]);

  // Attach data attribute to iframe when it appears for easier hit-test diagnostics
  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new MutationObserver(() => {
      const iframe = wrapperRef.current?.querySelector('iframe');
      if (iframe && debugTag) {
        iframe.setAttribute('data-player-iframe', debugTag);
      }
    });
    observer.observe(wrapperRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [debugTag]);
  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className}`}>
        <p className="text-white">動画が見つかりません</p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`} data-video-id={videoId}>
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
      {/* Debug overlay (only when debug) */}
      {debug && (
        <div className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded pointer-events-none select-none z-20">
          CF:{videoId.slice(0,8)}
        </div>
      )}
    </div>
  );
};
