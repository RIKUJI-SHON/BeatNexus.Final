import React, { useMemo, useEffect, useState } from 'react';

interface SimpleCloudflareIframeProps {
  videoId: string;
  className?: string;
  muted?: boolean;     // 再生時ミュートするか
  autoplay?: boolean;  // true のときのみ自動再生 (明示的指定がなければ false を付与)
  controls?: boolean;
}

// 初回ユーザー操作(クリック/タッチ/キー)まで透明オーバーレイを被せ、
// Cloudflare iframe がブラウザのポリシー緩和で勝手に再生開始するのを抑止。
const AutoPlayGuard: React.FC = () => {
  const [released, setReleased] = useState(false);
  useEffect(() => {
    const release = () => setReleased(true);
    window.addEventListener('pointerdown', release, { once: true });
    window.addEventListener('keydown', release, { once: true });
    return () => {
      window.removeEventListener('pointerdown', release);
      window.removeEventListener('keydown', release);
    };
  }, []);
  if (released) return null;
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-40"
      style={{
        background: 'transparent',
        // pointer イベントをキャッチして即解除
        cursor: 'pointer'
      }}
      onPointerDown={() => setReleased(true)}
    />
  );
};

// 超シンプル: Cloudflare Stream を直接 iframe 埋め込み
// iOS / Android のタップずれ検証用。問題解消後に正式プレイヤーへ戻す前提。
export const SimpleCloudflareIframe: React.FC<SimpleCloudflareIframeProps> = ({
  videoId,
  className = '',
  muted = false,
  autoplay = false,
  controls = true,
}) => {
  const src = useMemo(() => {
    const qs = new URLSearchParams();
    // Cloudflare 側のデフォルト autoplay が true になっているケースを避けるため常に明示
    qs.set('autoplay', autoplay ? 'true' : 'false');
    if (muted) qs.set('muted', 'true');
    if (controls) qs.set('controls', 'true');
    qs.set('preload', 'auto');
    return `https://iframe.videodelivery.net/${videoId}?${qs.toString()}`;
  }, [autoplay, muted, controls, videoId]);

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
    {/* 自動再生防止: ページロード直後に iframe 内部が勝手に start するケースを防ぐため、
      初回ユーザー操作までクリック透過させないシールドを用意 (必要なら後で削除) */}
    <AutoPlayGuard />
      <iframe
        src={src}
        title={videoId}
  // autoplay を allow から外してブラウザ側の自動再生パーミッションを付与しない
  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
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
    </div>
  );
};
