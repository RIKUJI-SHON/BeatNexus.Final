import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

/**
 * React Routerのページ遷移を自動的にトラッキングするフック
 */
export const useAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // ページタイトルを取得（より良いトラッキングのため）
    const pageTitle = document.title;
    
    // ページビューをトラッキング
    trackPageView(location.pathname + location.search, pageTitle);
  }, [location]);
};

/**
 * パフォーマンス計測のためのフック
 */
export const usePerformanceTracking = () => {
  useEffect(() => {
    // ページ読み込み時間を計測
    const measurePerformance = () => {
      if (window.performance && window.performance.timing) {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        if (loadTime > 0) {
          // パフォーマンス計測は analytics.ts の trackTiming を使用
          import('../utils/analytics').then(({ trackTiming }) => {
            trackTiming('page_load', loadTime, 'performance');
          });
        }
      }
    };

    // ページが完全に読み込まれた後に実行
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
      return () => window.removeEventListener('load', measurePerformance);
    }
  }, []);
}; 