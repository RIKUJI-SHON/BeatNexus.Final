import { useEffect, useMemo, useState } from 'react';
import { getDefaultAvatarUrl } from '../utils';

const CIRCULAR_AVATAR_CACHE = new Map<string, string>();

const isApproximatelySquare = (width: number, height: number) => {
  const tolerance = 2; // px 単位の許容誤差
  return Math.abs(width - height) <= tolerance;
};

const drawCenteredCircle = (image: HTMLImageElement) => {
  const size = Math.min(image.naturalWidth, image.naturalHeight);
  const offsetX = (image.naturalWidth - size) / 2;
  const offsetY = (image.naturalHeight - size) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();

  context.drawImage(image, offsetX, offsetY, size, size, 0, 0, size, size);

  try {
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to convert circular avatar to data URL:', error);
    return null;
  }
};

export const useCircularAvatar = (sourceUrl?: string | null): string => {
  const fallbackUrl = useMemo(() => getDefaultAvatarUrl(), []);
  const [processedUrl, setProcessedUrl] = useState<string>(sourceUrl || fallbackUrl);

  useEffect(() => {
    let isMounted = true;

    if (!sourceUrl) {
      setProcessedUrl(fallbackUrl);
      return () => {
        isMounted = false;
      };
    }

    const cacheKey = sourceUrl;
    const cached = CIRCULAR_AVATAR_CACHE.get(cacheKey);
    if (cached) {
      setProcessedUrl(cached);
      return () => {
        isMounted = false;
      };
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = sourceUrl;

    const handleLoad = () => {
      if (!isMounted) return;

      if (!image.naturalWidth || !image.naturalHeight) {
        setProcessedUrl(sourceUrl);
        CIRCULAR_AVATAR_CACHE.set(cacheKey, sourceUrl);
        return;
      }

      if (isApproximatelySquare(image.naturalWidth, image.naturalHeight)) {
        setProcessedUrl(sourceUrl);
        CIRCULAR_AVATAR_CACHE.set(cacheKey, sourceUrl);
        return;
      }

      const dataUrl = drawCenteredCircle(image) || sourceUrl;
      setProcessedUrl(dataUrl);
      CIRCULAR_AVATAR_CACHE.set(cacheKey, dataUrl);
    };

    const handleError = () => {
      if (!isMounted) return;
      setProcessedUrl(fallbackUrl);
      CIRCULAR_AVATAR_CACHE.set(cacheKey, fallbackUrl);
    };

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', handleError);

    return () => {
      isMounted = false;
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };
  }, [sourceUrl, fallbackUrl]);

  return processedUrl;
};
