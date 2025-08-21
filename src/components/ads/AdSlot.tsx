// AdSlot.tsx
// 役割: 指定 placementKey の広告を取得し、可視化されるDOMを提供。
// 最小 InFeed 用。後で variant に応じたレイアウト分岐を追加できるよう拡張ポイントを作る。

import React, { useRef } from 'react';
import { useAdServe } from '../../hooks/useAdServe';
import { useAdImpressionObserver } from '../../hooks/useAdImpressionObserver';
import { useAdClickTracker } from '../../hooks/useAdClickTracker';

interface AdSlotProps {
  placementKey: string;
  // variant は今後のレイアウト分岐用 (現段階未使用)
  variant?: 'infeed' | 'banner' | 'inline' | 'carousel';
  userId?: string;
  className?: string;
  render?: (p: { creative: ReturnType<typeof useAdServe>['creative']; click: () => void }) => React.ReactNode;
  preloadMargin?: string; // まだ未使用 (先読み用 rootMargin 拡張余地)
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementKey, variant='infeed', userId, className, render, preloadMargin='0px' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [defer, setDefer] = React.useState(false); // デバッグのため一時的にfalseに変更
  
  // デバッグログ追加
  React.useEffect(() => {
    console.log('🎯 AdSlot mounted:', { placementKey, variant, userId, defer });
  }, [placementKey, variant, userId, defer]);
  
  // IntersectionObserver で指定 margin 内に来たらフェッチ開始
  React.useEffect(() => {
    if (!containerRef.current) return;
    if (!defer) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        console.log('👁️ AdSlot visible, starting fetch for:', placementKey);
        setDefer(false);
        observer.disconnect();
      }
    }, { root: null, rootMargin: preloadMargin, threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [defer, preloadMargin, placementKey]);

  const serve = useAdServe(placementKey, { userId, defer });
  const click = useAdClickTracker({ creativeId: serve.creative?.id || null, placementId: placementKey, token: serve.token, userId });

  // デバッグログ追加
  React.useEffect(() => {
    console.log('📊 AdSlot serve state:', { 
      placementKey, 
      loading: serve.loading, 
      noFill: serve.noFill, 
      error: serve.error, 
      hasCreative: !!serve.creative,
      creative: serve.creative,
      token: serve.token
    });
  }, [placementKey, serve.loading, serve.noFill, serve.error, serve.creative, serve.token]);

  useAdImpressionObserver({
    enabled: !!serve.creative && !serve.noFill,
    ref: containerRef,
    creativeId: serve.creative?.id || null,
    placementId: placementKey,
    token: serve.token,
    userId,
  });

  // 状態分岐
  if (serve.loading) {
    console.log('⏳ AdSlot loading:', placementKey);
    return <div ref={containerRef} className={className} aria-busy="true" />;
  }
  if (serve.noFill) {
    console.log('🚫 AdSlot noFill:', placementKey);
    return null; // 広告データが存在しない場合は何も表示しない
  }
  if (serve.error) {
    console.log('❌ AdSlot error:', placementKey, serve.error);
    return null; // エラーの場合も何も表示しない
  }
  if (!serve.creative) {
    console.log('💥 AdSlot no creative:', placementKey);
    return null; // クリエイティブがない場合も何も表示しない
  }

  console.log('✅ AdSlot rendering creative:', placementKey, serve.creative);
  const c = serve.creative;
  const handleClick = () => click.trackClick({ target_url: c.target_url });

  // 配置キーからバリアントを自動判定
  const getVariantFromPlacement = (key: string): 'infeed' | 'banner' | 'inline' => {
    if (key.includes('banner')) return 'banner';
    if (key.includes('inline') || key.includes('mid')) return 'inline';
    return 'infeed';
  };

  const resolvedVariant = variant || getVariantFromPlacement(placementKey);

  return (
    <div ref={containerRef} className={className} data-ad-placement={placementKey} data-ad-creative={c.id}>
      {render ? (
        render({ creative: c, click: handleClick })
      ) : (
  <AdCard creative={c} onClick={handleClick} variant={resolvedVariant} />
      )}
    </div>
  );
};

// 広告カードコンポーネント（バトルカードと統一されたデザイン）
interface AdCardProps {
  creative: NonNullable<ReturnType<typeof useAdServe>['creative']>;
  onClick: () => void;
  variant?: 'infeed' | 'banner' | 'inline' | 'carousel';
}

const AdCard: React.FC<AdCardProps> = ({ creative, onClick, variant = 'infeed' }) => {
  // 旧 variant クラス組合せ関数は simple 系統へ統一したため未使用

  if (variant === 'carousel') {
    // カルーセル広告: 画像をカルーセル全体に表示
    return (
      <div className="bnx-ad-card bnx-ad-card--carousel group relative h-full w-full" role="article" aria-label="広告">
        {creative.file_url ? (
          <div className="h-full w-full relative overflow-hidden rounded-2xl">
            <img
              src={creative.file_url}
              alt="広告"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            {/* 広告であることを示すタグ */}
            <div className="absolute top-3 left-3 z-10">
              <span className="bnx-ad-badge bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">広告</span>
            </div>
          </div>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center rounded-2xl">
            <span className="text-gray-400 text-sm">広告を読み込み中...</span>
          </div>
        )}
      </div>
    );
  } else if (variant === 'banner' || variant === 'inline') {
    // banner/inline も simple スタイル系に統一 (横長/コンパクト差のみクラスで制御予定)
    const compact = variant === 'inline';
    return (
      <div className={"bnx-ad-card bnx-ad-card--simple group" + (compact ? " bnx-ad-card--compact" : " bnx-ad-card--wide")} role="article" aria-label={creative.headline || 'ad'}>
        <div className="bnx-ad-simple-grid" style={compact ? {gridTemplateColumns:'120px 1fr', minHeight:140} : {gridTemplateColumns:'200px 1fr', minHeight:180}}>
          {creative.file_url && (
            <div className="bnx-ad-simple-media-wrapper">
              <img
                src={creative.file_url}
                alt={creative.headline || 'ad'}
                className="bnx-ad-simple-img"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
          <div className="bnx-ad-simple-body">
            <div className="bnx-ad-simple-head">
              <span className="bnx-ad-badge">広告 / AD</span>
              {creative.headline && (
                <h4 className="bnx-ad-simple-title line-clamp-2">{creative.headline}</h4>
              )}
              {creative.body && (
                <p className="bnx-ad-simple-text line-clamp-2">{creative.body}</p>
              )}
            </div>
            {creative.cta_text && creative.target_url && (
              <button
                className="bnx-ad-simple-cta"
                onClick={onClick}
                aria-label={creative.cta_text}
              >
                {creative.cta_text}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // InFeed variant (battle list 挿入用) – バトルカード寄せデザイン
  // 指定プレースメントでは画像をより強調 (幅/高さ拡張)
  // InFeed はすべて統一: 固定画像カラム (160px) + 短文時拡張 (200px) を汎用ロジック化
  const shortCopy = (!creative.body || creative.body.length < 60);

  return (
    <div className={"bnx-ad-card bnx-ad-card--simple group" + (shortCopy ? " bnx-ad-card--simple-size-lg" : " bnx-ad-card--simple-size-md")} role="article" aria-label={creative.headline || 'ad'}>
      <div className="bnx-ad-simple-grid" data-size={shortCopy ? 'lg':'md'}>
        {creative.file_url && (
          <div className="bnx-ad-simple-media-wrapper">
            <img
              src={creative.file_url}
              alt={creative.headline || 'ad'}
              className="bnx-ad-simple-img"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
        <div className="bnx-ad-simple-body">
          <div className="bnx-ad-simple-head">
            <span className="bnx-ad-badge">広告 / AD</span>
            {creative.headline && (
              <h4 className="bnx-ad-simple-title line-clamp-2">{creative.headline}</h4>
            )}
            {creative.body && (
              <p className="bnx-ad-simple-text line-clamp-3">{creative.body}</p>
            )}
          </div>
          {creative.cta_text && creative.target_url && (
            <button
              className="bnx-ad-simple-cta"
              onClick={onClick}
              aria-label={creative.cta_text}
            >
              {creative.cta_text}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
