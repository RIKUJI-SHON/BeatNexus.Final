import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { useNews } from '../../hooks/useNews';
import { ArticleModal } from '../ui/ArticleModal';
import { AdSlot } from '../ads/AdSlot';
import type { NewsItem } from '../../types/news';

interface NewsSidebarProps {
  className?: string;
}

const NewsSidebar: React.FC<NewsSidebarProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { news, loading, error } = useNews({ limit: 3 }); // 最新3件のみ表示
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  if (loading) {
    return (
      <aside className={`space-y-4 ${className}`}>
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-800/50 rounded-lg"></div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className={`space-y-4 ${className}`}>
        <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{t('news.errorLoading', 'ニュースの読み込みに失敗しました')}</p>
        </div>
      </aside>
    );
  }

  if (news.length === 0) {
    return (
      <aside className={`space-y-4 ${className}`}>
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-3 uppercase tracking-wide">
            {t('news.latestNews', 'LATEST NEWS')}
          </h2>
          <p className="text-gray-400 text-sm">
            {t('news.comingSoon', '新着情報を準備中です')}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className={`space-y-4 ${className}`}>
        {/* Latest News Section */}
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm">
          <h2 className="text-white font-bold text-lg mb-4 uppercase tracking-wide">
            {t('news.latestNews', 'LATEST NEWS')}
          </h2>
          
          <div className="space-y-3">
            {news.map((item, index) => (
              <React.Fragment key={item.id}>
                <NewsSidebarCard
                  newsItem={item}
                  onClick={() => setSelectedArticle(item)}
                />
                {/* 1個目の記事の後に広告を配置 */}
                {index === 0 && (
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden">
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
        </div>
      </aside>

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

interface NewsSidebarCardProps {
  newsItem: NewsItem;
  onClick: () => void;
}

const NewsSidebarCard: React.FC<NewsSidebarCardProps> = ({ newsItem, onClick }) => {
  const hasExternalLink = !!newsItem.link_url;

  return (
    <div
      onClick={onClick}
      className="group relative bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700/30 hover:border-cyan-500/30 rounded-lg overflow-hidden cursor-pointer transition-all duration-300"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${newsItem.title} を読む`}
    >
      {/* Image */}
      {newsItem.image_url ? (
        <div className="relative h-32 overflow-hidden">
          <img
            src={newsItem.image_url}
            alt={newsItem.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
          <ChevronRight className="w-8 h-8 text-gray-600" />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2 group-hover:text-cyan-300 transition-colors">
          {newsItem.title}
        </h3>
        
        {newsItem.meta_description && (
          <p className="text-gray-400 text-xs line-clamp-2 mb-2">
            {newsItem.meta_description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {new Date(newsItem.published_at).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>

          {hasExternalLink && (
            <ExternalLink className="w-3 h-3 text-cyan-400 group-hover:text-cyan-300" />
          )}

          {newsItem.is_featured && (
            <span className="bg-yellow-500/80 text-yellow-100 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
              注目
            </span>
          )}
        </div>
      </div>

      {/* Hover effect border glow */}
      <div className="absolute inset-0 border border-cyan-500/0 group-hover:border-cyan-500/20 rounded-lg transition-colors pointer-events-none"></div>
    </div>
  );
};

export default NewsSidebar;
