import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { NewsItem, NewsHookState, NewsQuery } from '@/types/news';

export const useNews = (options: NewsQuery = {}): NewsHookState => {
  const { limit = 10, includeUnpublished = false } = options;
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('site_news')
        .select('*');

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

      setNews(data || []);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'ニュースの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [limit, includeUnpublished]);

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
