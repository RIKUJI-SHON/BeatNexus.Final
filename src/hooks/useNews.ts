import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { detectBrowserLanguage, validateLanguageCode } from '../lib/utils';
import type { NewsItem, NewsHookState, NewsQuery } from '../types/news';

export const useNews = (options: NewsQuery = {}): NewsHookState => {
  const { limit = 10, includeUnpublished = false, language: propLanguage } = options;
  const { user } = useAuthStore();
  const { i18n } = useTranslation();
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ユーザーの言語を解決する
  const resolveUserLanguage = useCallback(async (): Promise<string> => {
    // 1. propsで明示的に指定された言語
    if (propLanguage) {
      return validateLanguageCode(propLanguage);
    }

    // 2. ログインユーザーの場合：profiles.language
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', user.id)
          .single();
        
        if (!error && data?.language) {
          return validateLanguageCode(data.language);
        }
      } catch (err) {
        console.warn('Failed to fetch user language from profile:', err);
      }
    }

    // 3. 未認証の場合：i18n.language（ブラウザ言語基準）
    return validateLanguageCode(i18n.language || detectBrowserLanguage());
  }, [propLanguage, user, i18n.language]);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ユーザーの言語を取得
      const userLanguage = await resolveUserLanguage();
      console.log('🌐 useNews: Resolved user language:', userLanguage);

      // 言語でフィルタリングしてニュースを取得
      const fetchWithLanguage = async (lang: string): Promise<NewsItem[]> => {
        let query = supabase
          .from('site_news')
          .select('*')
          .eq('language', lang);

        // 公開状態でフィルタリング（管理者以外は公開記事のみ）
        if (!includeUnpublished) {
          query = query.eq('is_published', true);
        }

        // 表示順序でソート: display_order ASC, published_at DESC
        query = query
          .order('display_order', { ascending: true })
          .order('published_at', { ascending: false })
          .limit(limit);

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        return data || [];
      };

      // まずユーザー言語で取得を試行
      let newsData = await fetchWithLanguage(userLanguage);
      console.log(`🌐 useNews: Found ${newsData.length} news items for language "${userLanguage}"`);

      // ユーザー言語でニュースが0件の場合、英語にフォールバック
      if (newsData.length === 0 && userLanguage !== 'en') {
        console.log('🌐 useNews: No news found, falling back to English...');
        newsData = await fetchWithLanguage('en');
        console.log(`🌐 useNews: Found ${newsData.length} news items for fallback language "en"`);
      }

      setNews(newsData);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'ニュースの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [limit, includeUnpublished, resolveUserLanguage]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return {
    news,
    loading,
    error,
    refetch: fetchNews,
  };
};
