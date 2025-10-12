import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Newspaper, X } from 'lucide-react';
import clsx from 'clsx';
import { ArticleModal } from '../ui/ArticleModal';
import type { NewsItem } from '../../types/news';
import { NewsSidebarCard } from './NewsSidebar';
import { AdSlot } from '../ads/AdSlot';

interface MobileNewsDrawerProps {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  limit?: number;
  className?: string;
}

const DRAWER_WIDTH = 360;
const SWIPE_THRESHOLD = 48;

export const MobileNewsDrawer: React.FC<MobileNewsDrawerProps> = ({
  news,
  loading,
  error,
  onRetry,
  limit = 6,
  className,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const drawerPanelId = 'mobile-news-drawer-panel';

  const visibleNews = useMemo(() => (limit ? news.slice(0, limit) : news), [limit, news]);

  useEffect(() => {
    if (!open) {
      document.body.style.removeProperty('overflow');
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const resetDrag = useCallback(() => {
    touchStartX.current = null;
    touchCurrentX.current = null;
    setDragOffset(0);
  }, []);

  const beginTouch = useCallback((event: TouchEvent) => {
    const { clientX } = event.touches[0];
    const edgeZoneWidth = 24;
    if (!open && clientX > edgeZoneWidth) {
      return;
    }
    touchStartX.current = clientX;
    touchCurrentX.current = clientX;
  }, [open]);

  const moveTouch = useCallback((event: TouchEvent) => {
    if (touchStartX.current === null) return;
    const { clientX } = event.touches[0];
    touchCurrentX.current = clientX;
    const deltaX = clientX - touchStartX.current;

    if (!open && deltaX > 0) {
      setDragOffset(Math.min(deltaX, DRAWER_WIDTH));
    } else if (open && deltaX < 0) {
      setDragOffset(Math.max(deltaX, -DRAWER_WIDTH));
    }
  }, [open]);

  const endTouch = useCallback(() => {
    if (touchStartX.current === null || touchCurrentX.current === null) {
      resetDrag();
      return;
    }

    const deltaX = touchCurrentX.current - touchStartX.current;

    if (!open && deltaX > SWIPE_THRESHOLD) {
      setOpen(true);
    } else if (open && deltaX < -SWIPE_THRESHOLD) {
      setOpen(false);
    }

    resetDrag();
  }, [open, resetDrag]);

  useEffect(() => {
    window.addEventListener('touchstart', beginTouch);
    window.addEventListener('touchmove', moveTouch);
    window.addEventListener('touchend', endTouch);
    window.addEventListener('touchcancel', endTouch);
    return () => {
      window.removeEventListener('touchstart', beginTouch);
      window.removeEventListener('touchmove', moveTouch);
      window.removeEventListener('touchend', endTouch);
      window.removeEventListener('touchcancel', endTouch);
    };
  }, [beginTouch, moveTouch, endTouch]);

  const handleOverlayClick = useCallback(() => setOpen(false), []);
  const handleCardClick = useCallback((item: NewsItem) => setSelectedArticle(item), []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((skeleton) => (
            <div key={skeleton} className="h-28 bg-gray-800/50 animate-pulse rounded-lg" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm mb-3">{t('news.errorLoading', 'ニュースの読み込みに失敗しました')}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-cyan-300 underline"
            >
              {t('common.retry', '再試行する')}
            </button>
          )}
        </div>
      );
    }

    if (visibleNews.length === 0) {
      return (
        <div className="bg-gray-900/40 border border-gray-700/30 rounded-lg p-6 text-sm text-gray-300">
          {t('news.comingSoon', '新着情報を準備中です')}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {visibleNews.map((item, index) => (
          <React.Fragment key={item.id}>
            <NewsSidebarCard newsItem={item} onClick={() => handleCardClick(item)} />
            {index === 0 && (
              <div className="relative w-full overflow-hidden rounded-xl">
                <AdSlot
                  placementKey="home.hero.section.after.carousel"
                  variant="carousel"
                  className="h-full w-full"
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const drawerStyle = {
    transform: open
      ? 'translateX(0)'
      : `translateX(-100%) translateX(-1.5rem)`,
  } as React.CSSProperties;

  const dragStyle = dragOffset !== 0 ? { transform: `translateX(${dragOffset - DRAWER_WIDTH}px)` } : undefined;

  return (
    <div className={clsx('lg:hidden', className)} aria-hidden={false}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'fixed top-1/2 left-0 z-[60] flex transform -translate-x-1/2 -translate-y-1/2 items-stretch rounded-r-3xl bg-gray-950/90 border border-cyan-500/50 border-l-transparent pl-3 pr-4 py-4 shadow-lg shadow-cyan-900/40 backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 transition-opacity duration-200',
          open && 'pointer-events-none opacity-0'
        )}
        aria-label={t('news.openLatest', '最新ニュースを開く')}
        aria-expanded={open}
        aria-controls={drawerPanelId}
      >
        <div className="flex w-full min-w-[4.5rem] items-center gap-3 text-white">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 shadow-inner">
            <Newspaper className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="flex flex-1 flex-col items-end justify-center border-l border-cyan-500/40 pl-3 text-[11px] font-semibold tracking-widest">
            <div className="flex flex-col items-end leading-none">
              <span className="uppercase">L</span>
              <span className="uppercase">A</span>
              <span className="uppercase">T</span>
              <span className="uppercase">E</span>
              <span className="uppercase">S</span>
              <span className="uppercase">T</span>
            </div>
            <div className="mt-2 flex flex-col items-end leading-none text-cyan-200">
              <span className="uppercase">N</span>
              <span className="uppercase">E</span>
              <span className="uppercase">W</span>
              <span className="uppercase">S</span>
            </div>
          </div>
        </div>
      </button>

      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-[360px] rounded-r-3xl border border-cyan-500/20 bg-gray-950/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out',
        )}
        style={dragStyle ?? drawerStyle}
        role="dialog"
        aria-modal="true"
        aria-label={t('news.latestNews', 'LATEST NEWS')}
        id={drawerPanelId}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-white">
            <Newspaper className="h-5 w-5 text-cyan-300" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-cyan-300">{t('news.latestNews', 'LATEST NEWS')}</span>
              <span className="text-sm text-gray-300">{t('news.mobileDrawer.subtitle', 'Stay up to date with the latest announcements')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-gray-400 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300"
            aria-label={t('common.close', '閉じる')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="custom-scrollbar h-full overflow-y-auto px-5 py-4 pb-20">
          {renderContent()}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          onClick={handleOverlayClick}
        />
      )}

      {selectedArticle && (
        <ArticleModal
          news={selectedArticle}
          isOpen={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
};

export default MobileNewsDrawer;
