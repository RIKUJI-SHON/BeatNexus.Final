import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious, 
  CarouselApi 
} from '@/components/ui/carousel';
import { ArticleModal } from '@/components/ui/ArticleModal';
import { useNews } from '@/hooks/useNews';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { NewsItem } from '@/types/news';
import heroBackground from '@/assets/images/hero-background.png';
import beatnexusWordmark from '@/assets/images/BEATNEXUS-WORDMARK.png';

interface NewsCarouselProps {
  className?: string;
}

const NewsCarousel: React.FC<NewsCarouselProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { news, loading, error } = useNews({ limit: 8 }); // 表示件数を8件に増加
  const { setOnboardingModalOpen } = useOnboardingStore();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // 固定のHow-to Guideパネル
  const howToGuidePanel = {
    id: 'how-to-guide',
    title: t('battlesPage.welcome.guide.checkGuide'),
    isGuide: true
  };

  // 全パネル（ガイド + ニュース）
  const allPanels = [howToGuidePanel, ...news];

  // 現在のスライドインデックスを監視と手動操作検出
  useEffect(() => {
    if (!api) return;

    let isManualOperation = false;

    const handleSelect = () => {
      setCurrent(api.selectedScrollSnap());
      
      // 手動操作の場合は自動スライドを一時停止
      if (isManualOperation) {
        setIsAutoPlaying(false);
        setTimeout(() => setIsAutoPlaying(true), 5000); // 5秒後に再開
        isManualOperation = false;
      }
    };

    // 手動操作（矢印クリック、ドラッグ）を検出
    const handlePointerDown = () => {
      isManualOperation = true;
    };

    api.on('select', handleSelect);
    api.on('pointerDown', handlePointerDown);

    return () => {
      api.off('select', handleSelect);
      api.off('pointerDown', handlePointerDown);
    };
  }, [api]);

  // 自動スライド機能
  useEffect(() => {
    if (!api || !isAutoPlaying || allPanels.length <= 1) return;

    const autoSlideTimer = setInterval(() => {
      const nextIndex = (current + 1) % allPanels.length;
      api.scrollTo(nextIndex);
    }, 8000); // 8秒間隔でゆっくりスライド

    return () => clearInterval(autoSlideTimer);
  }, [api, current, allPanels.length, isAutoPlaying]);

  // マウスホバー時に自動スライドを一時停止
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => {
    // マウスが離れてから3秒後に自動スライドを再開
    setTimeout(() => setIsAutoPlaying(true), 3000);
  };

  const handlePanelClick = (panel: typeof howToGuidePanel | NewsItem) => {
    if ('isGuide' in panel) {
      // How-to Guideパネルの場合
      setOnboardingModalOpen(true);
    } else {
      // ニュースパネルの場合 - 全て記事モーダルを開く
      setSelectedArticle(panel);
    }
  };

  const renderPanel = (panel: typeof howToGuidePanel | NewsItem) => {
    if ('isGuide' in panel) {
      // How-to Guideパネル
      return (
        <div
          key={panel.id}
          className="relative h-64 sm:h-72 md:h-80 lg:h-96 rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => handlePanelClick(panel)}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
              style={{ backgroundImage: `url(${heroBackground})` }}
            >
              {/* グラデーションオーバーレイ */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/85 to-gray-950/90"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-gray-900/40"></div>
            </div>
          </div>

          {/* Background Effects */}
          <div className="absolute inset-0">
            <div className="absolute top-4 left-4 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-4 right-4 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-between text-center px-6 py-8">
            {/* スペーサー */}
            <div></div>
            
            {/* BEATNEXUS Wordmark - より大きく */}
            <div className="group-hover:scale-105 transition-transform duration-300">
              <img 
                src={beatnexusWordmark} 
                alt="BEATNEXUS"
                className="mx-auto max-w-48 sm:max-w-56 md:max-w-64 lg:max-w-72 h-auto drop-shadow-xl"
              />
            </div>
            
            {/* Guide Text - 下部に一行で配置 */}
            <div className="text-sm text-gray-400">
              <span className="text-cyan-400 font-semibold group-hover:text-cyan-300 transition-colors">
                {t('battlesPage.welcome.guide.newHere')} {t('battlesPage.welcome.guide.checkGuide')}
              </span>
            </div>
          </div>
        </div>
      );
    } else {
      // ニュースパネル（articleタイプのみ）
      return (
        <div
          key={panel.id}
          className="relative h-64 sm:h-72 md:h-80 lg:h-96 rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => handlePanelClick(panel)}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            {panel.image_url ? (
              <img 
                src={panel.image_url} 
                alt={panel.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
            )}
            {/* オーバーレイ */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-end p-6">
            <h3 className="text-white font-bold text-lg sm:text-xl mb-2 line-clamp-2 group-hover:text-cyan-300 transition-colors">
              {panel.title}
            </h3>
            
            <p className="text-gray-300 text-sm line-clamp-2 mb-3">
              {panel.meta_description || panel.body}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {new Date(panel.published_at).toLocaleDateString('ja-JP')}
              </div>
              
              {/* 注目記事バッジ */}
              {panel.is_featured && (
                <div className="bg-yellow-500/80 text-yellow-100 px-2 py-1 rounded text-xs font-semibold">
                  注目
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <section className={`relative mb-8 overflow-hidden rounded-2xl border border-gray-700/50 ${className}`}>
        <div className="h-64 sm:h-72 md:h-80 lg:h-96 bg-gray-800 animate-pulse rounded-2xl flex items-center justify-center">
          <div className="text-gray-400">読み込み中...</div>
        </div>
      </section>
    );
  }

  if (error) {
    // エラー時はHow-to Guideのみ表示
    return (
      <section className={`relative mb-8 overflow-hidden rounded-2xl border border-gray-700/50 ${className}`}>
        {renderPanel(howToGuidePanel)}
      </section>
    );
  }

  if (allPanels.length === 1) {
    // How-to Guideのみの場合
    return (
      <section className={`relative mb-8 overflow-hidden rounded-2xl border border-gray-700/50 ${className}`}>
        {renderPanel(howToGuidePanel)}
      </section>
    );
  }

  return (
    <>
      <section 
        className={`relative mb-8 overflow-hidden rounded-2xl border border-gray-700/50 ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Carousel 
          setApi={setApi}
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent>
            {allPanels.map((panel) => (
              <CarouselItem key={panel.id} className="pl-0">
                {renderPanel(panel)}
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Navigation Arrows */}
          {allPanels.length > 1 && (
            <>
              <CarouselPrevious 
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 border-gray-600 text-white hover:bg-black/70 hover:text-cyan-300 z-10"
              >
                <span className="sr-only">前へ</span>
              </CarouselPrevious>
              <CarouselNext 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 border-gray-600 text-white hover:bg-black/70 hover:text-cyan-300 z-10"
              >
                <span className="sr-only">次へ</span>
              </CarouselNext>
            </>
          )}

          {/* Dots Indicator */}
          {allPanels.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {allPanels.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    api?.scrollTo(index);
                    // 手動操作なので、一時的に自動スライドを停止
                    setIsAutoPlaying(false);
                    setTimeout(() => setIsAutoPlaying(true), 5000); // 5秒後に再開
                  }}
                  className={`w-2 h-2 rounded-full transition-colors hover:scale-125 ${
                    index === current ? 'bg-cyan-400' : 'bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`スライド ${index + 1} に移動`}
                />
              ))}
            </div>
          )}
        </Carousel>
      </section>

      {/* Article Modal */}
      {selectedArticle && (
        <ArticleModal
          news={selectedArticle}
          isOpen={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </>
  );
};

export default NewsCarousel;
