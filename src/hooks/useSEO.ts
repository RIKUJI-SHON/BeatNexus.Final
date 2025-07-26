import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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
      // 現在の場所から生成
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const pathname = location.pathname;
      
      if (excludeQueryParams) {
        // クエリパラメータを除外
        finalCanonicalUrl = `${baseUrl}${pathname}`;
      } else {
        // クエリパラメータを含める
        finalCanonicalUrl = `${baseUrl}${pathname}${location.search}`;
      }
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
}

export function useDynamicMeta(options: UseDynamicMetaOptions = {}) {
  const { title, description, titleSuffix = ' - BeatNexus' } = options;

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
