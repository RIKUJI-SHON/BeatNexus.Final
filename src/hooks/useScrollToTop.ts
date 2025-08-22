import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ページ遷移時に自動的にスクロール位置をページトップにリセットするフック
 * SPAでのルート変更時にスクロール位置が保持される問題を解決します
 */
export function useScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // ページ遷移時にスクロール位置をトップに戻す
    window.scrollTo(0, 0);
    
    // フォーカスをメインコンテンツに移動（アクセシビリティ向上）
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
    }
  }, [location.pathname]); // pathnameが変わった時のみ実行

  // このフックは値を返さないため、void
}
