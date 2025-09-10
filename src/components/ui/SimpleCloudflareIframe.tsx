import React, { useState, useMemo } from 'react';

interface SimpleCloudflareIframeProps {
  videoId: string;
  className?: string;
  muted?: boolean;           // 再生時にミュートするか（初期マウント時は使わない）
  autoplay?: boolean;        // クリック後 iframe 生成時に autoplay=true を付与するか
  controls?: boolean;
  clickToActivate?: boolean; // 初期表示で iframe を生成せずクリックで生成
  posterUrl?: string;        // 任意ポスター
}

// 超シンプル: Cloudflare Stream を直接 iframe 埋め込み
// iOS / Android のタップずれ検証用。問題解消後に正式プレイヤーへ戻す前提。
export const SimpleCloudflareIframe: React.FC<SimpleCloudflareIframeProps> = ({
  videoId,
  className = '',
  muted = false,
  autoplay = false,
  controls = true,
  clickToActivate = true,
  posterUrl,
}) => {
  const [activated, setActivated] = useState(!clickToActivate); // 初期はクリック待ち

  const src = useMemo(() => {
    if (!activated) return '';
    const qs = new URLSearchParams();
    if (autoplay) qs.set('autoplay', 'true'); // 必要な場合のみ付与
    if (muted) qs.set('muted', 'true');
    if (controls) qs.set('controls', 'true');
    qs.set('preload', 'auto');
    return `https://iframe.videodelivery.net/${videoId}?${qs.toString()}`;
  }, [activated, autoplay, muted, controls, videoId]);

  const debug = import.meta.env.VITE_DEBUG_VIDEO_LAYOUT === 'true';
  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white text-sm ${className}`}>
        Video not found
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full relative overflow-hidden touch-manipulation ${className}`}
      data-simple-cf
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {debug && (
        <div className="absolute inset-0 pointer-events-none border border-yellow-400/60 z-[5] text-[10px] text-yellow-300 font-mono flex items-start gap-1 p-1">
          <span>IFRAME {videoId.slice(0,8)}</span>
        </div>
      )}
      {!activated && (
        <button
          type="button"
          onClick={() => setActivated(true)}
          className="group absolute inset-0 w-full h-full flex items-center justify-center bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          aria-label="再生"
        >
          {posterUrl && (
            <img
              src={posterUrl}
              alt="poster"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-50 transition-opacity"
              draggable={false}
            />
          )}
          <div className="relative z-10 flex flex-col items-center text-white">
            <div className="w-16 h-16 rounded-full bg-cyan-600/80 group-hover:bg-cyan-500 flex items-center justify-center shadow-lg transition-colors">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="mt-3 text-xs tracking-wide font-medium opacity-90">TAP TO PLAY</span>
          </div>
        </button>
      )}
      {activated && (
        <iframe
          src={src}
          title={videoId}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          // @ts-expect-error playsInline iframe attribute (Safari inline playback hint)
          playsInline="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: '0',
            display: 'block',
            backgroundColor: 'black'
          }}
        />
      )}
    </div>
  );
};
