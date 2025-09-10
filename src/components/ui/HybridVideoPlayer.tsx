import React, { SyntheticEvent, useEffect, useRef, useState } from 'react';

// Minimal global interface for Cloudflare Stream SDK detection
interface CloudflareStreamGlobal {
  Stream?: unknown; // presence check only
}
declare const window: Window & typeof globalThis & CloudflareStreamGlobal;
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
  debugTag?: string; // 'A' | 'B'
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
  debugTag,
}) => {
  // Cloudflare Stream SDK readiness (productionで初回プレイヤーだけコントロールが出ない問題対策)
  const [streamReady, setStreamReady] = useState(!streamVideoId); // 通常動画 or 未指定なら即 ready
  const [mountVersion, setMountVersion] = useState(0); // 強制再マウントキー
  const readyCheckRef = useRef<number | null>(null);

  useEffect(() => {
    if (!streamVideoId) return; // Supabase 動画は不要

    // 既に window.Stream があれば即 ready
  if (typeof window !== 'undefined' && typeof window.Stream !== 'undefined') {
      setStreamReady(true);
      return;
    }

    // ポーリングで SDK ロード完了を検知
    let elapsed = 0;
    const interval = 120; // ms
    const timeoutMs = 4000; // 4秒で諦めて表示 (その後ユーザー interaction で描画されるケースに期待)
    readyCheckRef.current = window.setInterval(() => {
      elapsed += interval;
  if (typeof window.Stream !== 'undefined') {
        clearInterval(readyCheckRef.current!);
        readyCheckRef.current = null;
        setStreamReady(true);
        // 初回ロード遅延でコントロールが付与されないケースに備えて少し後に強制再マウント
        setTimeout(() => setMountVersion(v => v + 1), 600);
      } else if (elapsed >= timeoutMs) {
        clearInterval(readyCheckRef.current!);
        readyCheckRef.current = null;
        setStreamReady(true); // タイムアウト: とりあえず描画
        // さらに後でもう一度再マウント試行
        setTimeout(() => setMountVersion(v => v + 1), 1500);
      }
    }, interval);

    return () => {
      if (readyCheckRef.current) {
        clearInterval(readyCheckRef.current);
        readyCheckRef.current = null;
      }
    };
  }, [streamVideoId]);

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
    if (!streamReady) {
      return (
        <div className={`flex items-center justify-center bg-black/60 text-gray-400 text-xs ${className}`}>
          <span>Loading Player...</span>
        </div>
      );
    }
    return (
      <StreamVideoPlayer
        key={streamVideoId + ':' + mountVersion}
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
  debugTag={debugTag}
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
