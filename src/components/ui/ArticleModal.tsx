import React from 'react';
import { X, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { ArticleModalProps } from '@/types/news';

export const ArticleModal: React.FC<ArticleModalProps> = ({ news, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Markdown の簡易レンダリング（後でreact-markdownに置き換え可能）
  const renderMarkdown = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        // 見出し
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold text-white mt-6 mb-3">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold text-white mt-8 mb-4">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold text-white mt-8 mb-6">{line.slice(2)}</h1>;
        }
        
        // リスト
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <li key={index} className="text-gray-300 ml-4 mb-1 list-disc">
              {line.trim().slice(2)}
            </li>
          );
        }
        if (line.trim().match(/^\d+\. /)) {
          return (
            <li key={index} className="text-gray-300 ml-4 mb-1 list-decimal">
              {line.trim().replace(/^\d+\. /, '')}
            </li>
          );
        }

        // 太字
        const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
        
        // 空行
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // 通常のテキスト
        return (
          <p key={index} className="text-gray-300 mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: boldText }} />
        );
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[95vh] sm:h-[90vh] bg-gray-900 rounded-lg sm:rounded-xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-2 sm:pr-4">
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 line-clamp-2">{news.title}</h1>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400">
                {/* 公開日 */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(news.published_at), 'yyyy年MM月dd日', { locale: ja })}
                  </span>
                </div>
                
                {/* タグ */}
                {news.tags && news.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <div className="flex gap-1 flex-wrap">
                      {news.tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 閉じるボタン */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="閉じる"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* ボディ - スクロール可能 */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* メイン画像 */}
          {news.image_url && (
            <div className="w-full h-64 relative flex-shrink-0">
              <img
                src={news.image_url}
                alt={news.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
            </div>
          )}

          {/* 記事内容 */}
          <div className="p-4 sm:p-6 pb-12">
            {/* 概要（meta_description） */}
            {news.meta_description && (
              <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-cyan-200 text-base sm:text-lg leading-relaxed">
                  {news.meta_description}
                </p>
              </div>
            )}

            {/* Markdown記事本文 */}
            {news.article_content && (
              <div className="prose prose-invert prose-sm sm:prose-base max-w-none space-y-4">
                {renderMarkdown(news.article_content)}
              </div>
            )}

            {/* フォールバック: bodyを表示 */}
            {!news.article_content && (
              <div className="text-gray-300 leading-relaxed space-y-4 text-sm sm:text-base">
                {news.body.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 p-3 sm:p-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleModal;
