import { useEffect, useRef } from 'react';

/**
 * モーダルダイアログ内でフォーカストラップを実装するカスタムフック
 * 
 * - Tab/Shift+Tab でフォーカス可能な要素間を循環
 * - Esc キーでモーダルを閉じる
 * - モーダル開閉時にフォーカス位置を復帰
 * 
 * @param isOpen モーダルの開閉状態
 * @param onClose モーダルを閉じる関数
 * @returns モーダルコンテナに設定する ref
 */
export function useFocusTrap(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // モーダルを開いたときに、以前フォーカスしていた要素を記憶
    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;

    // フォーカス可能な要素のセレクタ
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // フォーカス可能な要素のリストを取得
    const getFocusableElements = (): HTMLElement[] => {
      return Array.from(container.querySelectorAll(focusableSelector)) as HTMLElement[];
    };

    // モーダル内の最初の要素にフォーカス
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // キーボードイベントハンドラ
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escキーでモーダルを閉じる
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Tab キーでフォーカストラップ
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab (逆方向)
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab (順方向)
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // イベントリスナーを追加
    container.addEventListener('keydown', handleKeyDown);

    // クリーンアップ: モーダルを閉じたときに以前の要素にフォーカスを戻す
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return containerRef;
}
