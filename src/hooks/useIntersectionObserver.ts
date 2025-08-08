import { useEffect, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
}

/**
 * Intersection Observer フック
 * 要素がビューポートに入ったときを検知する
 */
export const useIntersectionObserver = (
  ref: RefObject<Element>,
  options?: UseIntersectionObserverOptions
): boolean => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.3, // 30%が見えたら検知（より確実に検知）
        root: null,
        rootMargin: '100px', // 100px手前から検知（余裕を持って読み込み開始）
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
};
