export type ContentType = 'article';

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  image_url?: string;
  link_url?: string; // 外部リンクURL（任意）
  content_type: ContentType;
  article_content: string; // articleタイプのみなので必須にする
  meta_description?: string;
  tags?: string[];
  is_featured: boolean;
  is_published: boolean;
  display_order: number;
  published_at: string;
  created_at: string;
  updated_at: string;
  language: 'en'|'ja'|'ko'|'zh-CN'|'es'|'pt-BR'|'fr'|'de';
}

export interface NewsHookState {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface NewsQuery {
  limit?: number;
  includeUnpublished?: boolean;
  language?: string;
}

export interface ArticleModalProps {
  news: NewsItem;
  isOpen: boolean;
  onClose: () => void;
}
