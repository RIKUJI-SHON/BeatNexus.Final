import React from 'react';

interface SimpleCloudflareIframeProps {
  videoId: string;
  className?: string;
  muted?: boolean;
  autoplay?: boolean;
  controls?: boolean;
}

// 超シンプル: Cloudflare Stream を直接 iframe 埋め込み
// iOS / Android のタップずれ検証用。問題解消後に正式プレイヤーへ戻す前提。
export const SimpleCloudflareIframe: React.FC<SimpleCloudflareIframeProps> = ({
  videoId,
  className = '',
  muted = true,
  autoplay = false,
  controls = true,
}) => {
  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white text-sm ${className}`}>
        Video not found
      </div>
    );
  }

  const params = new URLSearchParams({
    autoplay: autoplay ? 'true' : 'false',
    muted: muted ? 'true' : 'false',
    preload: 'auto',
    controls: controls ? 'true' : 'false'
  }).toString();

  const src = `https://iframe.videodelivery.net/${videoId}?${params}`;

  return (
    <div className={`w-full h-full relative ${className}`} data-simple-cf>
      <iframe
        src={src}
        title={videoId}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
  // @ts-expect-error playsInline iframe attribute (Safari inline playback hint)
        playsInline="true"
        style={{
          width: '100%',
          height: '100%',
          border: '0',
          display: 'block'
        }}
      />
    </div>
  );
};
