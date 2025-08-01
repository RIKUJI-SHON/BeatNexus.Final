import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getCanonicalUrl, SEO_CONFIG } from '../utils/seoConfig';

/**
 * SEO用のCanonical URLを動的に設定するフック
 * 重複コンテンツ問題を防ぐため、正規のURLを検索エンジンに伝えます
 */
interface UseCanonicalUrlOptions {
  /** カスタムの正規URL（指定しない場合は現在のURLを使用） */
  canonicalUrl?: string;
  /** クエリパラメータを除外するかどうか（デフォルト: true） */
  excludeQueryParams?: boolean;
}

export function useCanonicalUrl(options: UseCanonicalUrlOptions = {}) {
  const location = useLocation();
  const { canonicalUrl, excludeQueryParams = true } = options;

  useEffect(() => {
    // 既存のcanonical linkタグを削除
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    if (existingCanonical) {
      existingCanonical.remove();
    }

    // 新しいcanonical URLを決定
    let finalCanonicalUrl: string;
    
    if (canonicalUrl) {
      // カスタムURLが指定されている場合
      finalCanonicalUrl = canonicalUrl;
    } else {
      // 統一設定を使用して正規URLを生成
      const pathname = location.pathname;
      const search = excludeQueryParams ? '' : location.search;
      finalCanonicalUrl = getCanonicalUrl(`${pathname}${search}`);
    }

    // 新しいcanonical linkタグを作成
    const canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    canonicalLink.href = finalCanonicalUrl;
    
    // HTMLのheadに追加
    document.head.appendChild(canonicalLink);

    // コンポーネントがアンマウントされる時にクリーンアップ
    return () => {
      const linkToRemove = document.querySelector(`link[rel="canonical"][href="${finalCanonicalUrl}"]`);
      if (linkToRemove) {
        linkToRemove.remove();
      }
    };
  }, [location.pathname, location.search, canonicalUrl, excludeQueryParams]);
}

/**
 * ページタイトルとmeta descriptionを動的に設定するフック
 * SEO対策として使用します
 */
interface UseDynamicMetaOptions {
  /** ページタイトル */
  title?: string;
  /** meta description */
  description?: string;
  /** タイトルの後ろに付けるサフィックス（デフォルト: " - BeatNexus"） */
  titleSuffix?: string;
  /** meta keywords */
  keywords?: string;
  /** meta author */
  author?: string;
  /** meta robots */
  robots?: string;
  /** Open Graph title */
  ogTitle?: string;
  /** Open Graph description */
  ogDescription?: string;
  /** Open Graph image */
  ogImage?: string;
  /** Open Graph type */
  ogType?: string;
  /** Twitter Card type */
  twitterCard?: string;
  /** Twitter title */
  twitterTitle?: string;
  /** Twitter description */
  twitterDescription?: string;
  /** Twitter image */
  twitterImage?: string;
}

export function useDynamicMeta(options: UseDynamicMetaOptions = {}) {
  const { 
    title, 
    description, 
    titleSuffix = ' - BeatNexus',
    keywords,
    author,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage
  } = options;

  useEffect(() => {
    if (title) {
      document.title = `${title}${titleSuffix}`;
    }
  }, [title, titleSuffix]);

  useEffect(() => {
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      
      metaDescription.setAttribute('content', description);
    }
  }, [description]);

  // Keywords meta tag
  useEffect(() => {
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      
      metaKeywords.setAttribute('content', keywords);
    }
  }, [keywords]);

  // Author meta tag
  useEffect(() => {
    if (author) {
      let metaAuthor = document.querySelector('meta[name="author"]');
      
      if (!metaAuthor) {
        metaAuthor = document.createElement('meta');
        metaAuthor.setAttribute('name', 'author');
        document.head.appendChild(metaAuthor);
      }
      
      metaAuthor.setAttribute('content', author);
    }
  }, [author]);

  // Robots meta tag
  useEffect(() => {
    if (robots) {
      let metaRobots = document.querySelector('meta[name="robots"]');
      
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.setAttribute('name', 'robots');
        document.head.appendChild(metaRobots);
      }
      
      metaRobots.setAttribute('content', robots);
    }
  }, [robots]);

  // Open Graph meta tags
  useEffect(() => {
    if (ogTitle) {
      let ogTitleMeta = document.querySelector('meta[property="og:title"]');
      
      if (!ogTitleMeta) {
        ogTitleMeta = document.createElement('meta');
        ogTitleMeta.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitleMeta);
      }
      
      ogTitleMeta.setAttribute('content', ogTitle);
    }
  }, [ogTitle]);

  useEffect(() => {
    if (ogDescription) {
      let ogDescMeta = document.querySelector('meta[property="og:description"]');
      
      if (!ogDescMeta) {
        ogDescMeta = document.createElement('meta');
        ogDescMeta.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescMeta);
      }
      
      ogDescMeta.setAttribute('content', ogDescription);
    }
  }, [ogDescription]);

  useEffect(() => {
    if (ogImage) {
      let ogImageMeta = document.querySelector('meta[property="og:image"]');
      
      if (!ogImageMeta) {
        ogImageMeta = document.createElement('meta');
        ogImageMeta.setAttribute('property', 'og:image');
        document.head.appendChild(ogImageMeta);
      }
      
      ogImageMeta.setAttribute('content', ogImage);
    }
  }, [ogImage]);

  // og:url を自動設定（統一ドメインを使用）
  useEffect(() => {
    let ogUrlMeta = document.querySelector('meta[property="og:url"]');
    
    if (!ogUrlMeta) {
      ogUrlMeta = document.createElement('meta');
      ogUrlMeta.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrlMeta);
    }
    
    // 常に公式ドメインを使用
    const currentPath = window.location.pathname + window.location.search;
    ogUrlMeta.setAttribute('content', getCanonicalUrl(currentPath));
  }, []);

  useEffect(() => {
    if (ogType) {
      let ogTypeMeta = document.querySelector('meta[property="og:type"]');
      
      if (!ogTypeMeta) {
        ogTypeMeta = document.createElement('meta');
        ogTypeMeta.setAttribute('property', 'og:type');
        document.head.appendChild(ogTypeMeta);
      }
      
      ogTypeMeta.setAttribute('content', ogType);
    }
  }, [ogType]);

  // Twitter Card meta tags
  useEffect(() => {
    if (twitterCard) {
      let twitterCardMeta = document.querySelector('meta[name="twitter:card"]');
      
      if (!twitterCardMeta) {
        twitterCardMeta = document.createElement('meta');
        twitterCardMeta.setAttribute('name', 'twitter:card');
        document.head.appendChild(twitterCardMeta);
      }
      
      twitterCardMeta.setAttribute('content', twitterCard);
    }
  }, [twitterCard]);

  useEffect(() => {
    if (twitterTitle) {
      let twitterTitleMeta = document.querySelector('meta[name="twitter:title"]');
      
      if (!twitterTitleMeta) {
        twitterTitleMeta = document.createElement('meta');
        twitterTitleMeta.setAttribute('name', 'twitter:title');
        document.head.appendChild(twitterTitleMeta);
      }
      
      twitterTitleMeta.setAttribute('content', twitterTitle);
    }
  }, [twitterTitle]);

  useEffect(() => {
    if (twitterDescription) {
      let twitterDescMeta = document.querySelector('meta[name="twitter:description"]');
      
      if (!twitterDescMeta) {
        twitterDescMeta = document.createElement('meta');
        twitterDescMeta.setAttribute('name', 'twitter:description');
        document.head.appendChild(twitterDescMeta);
      }
      
      twitterDescMeta.setAttribute('content', twitterDescription);
    }
  }, [twitterDescription]);

  useEffect(() => {
    if (twitterImage) {
      let twitterImageMeta = document.querySelector('meta[name="twitter:image"]');
      
      if (!twitterImageMeta) {
        twitterImageMeta = document.createElement('meta');
        twitterImageMeta.setAttribute('name', 'twitter:image');
        document.head.appendChild(twitterImageMeta);
      }
      
      twitterImageMeta.setAttribute('content', twitterImage);
    }
  }, [twitterImage]);

  // Twitter URL を自動設定（統一ドメインを使用）
  useEffect(() => {
    let twitterUrlMeta = document.querySelector('meta[name="twitter:url"]');
    
    if (!twitterUrlMeta) {
      twitterUrlMeta = document.createElement('meta');
      twitterUrlMeta.setAttribute('name', 'twitter:url');
      document.head.appendChild(twitterUrlMeta);
    }
    
    // 常に公式ドメインを使用
    const currentPath = window.location.pathname + window.location.search;
    twitterUrlMeta.setAttribute('content', getCanonicalUrl(currentPath));
  }, []);
}

/**
 * SEO用のnoindexを動的に設定するフック
 * 検索エンジンにインデックスされたくないページで使用します
 */
interface UseNoIndexOptions {
  /** noindexを設定するかどうか */
  shouldNoIndex: boolean;
}

export function useNoIndex({ shouldNoIndex }: UseNoIndexOptions) {
  useEffect(() => {
    let noIndexMeta = document.querySelector('meta[name="robots"]');
    
    if (shouldNoIndex) {
      if (!noIndexMeta) {
        noIndexMeta = document.createElement('meta');
        noIndexMeta.setAttribute('name', 'robots');
        document.head.appendChild(noIndexMeta);
      }
      noIndexMeta.setAttribute('content', 'noindex, nofollow');
    } else {
      // noindexが不要な場合は削除
      if (noIndexMeta) {
        noIndexMeta.remove();
      }
    }

    // クリーンアップ
    return () => {
      if (shouldNoIndex && noIndexMeta) {
        noIndexMeta.remove();
      }
    };
  }, [shouldNoIndex]);
}
