-- content_typeをarticleのみに変更し、デフォルト値も変更
ALTER TABLE public.site_news 
DROP CONSTRAINT IF EXISTS site_news_content_type_check;

ALTER TABLE public.site_news 
ADD CONSTRAINT site_news_content_type_check 
CHECK (content_type = 'article');

-- デフォルト値をarticleに変更
ALTER TABLE public.site_news 
ALTER COLUMN content_type SET DEFAULT 'article';

-- 既存データを全てarticleに更新（現在は空なので影響なし）
UPDATE public.site_news 
SET content_type = 'article' 
WHERE content_type != 'article';
