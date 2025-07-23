-- Create badges table to store special user badges
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    is_special BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    criteria JSONB, -- Optional criteria for earning the badge
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view badges" 
    ON public.badges FOR SELECT 
    USING (true);

-- Only authenticated users can insert/update/delete badges (admin functionality)
CREATE POLICY "Authenticated users can manage badges" 
    ON public.badges FOR ALL 
    USING (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE public.badges IS 'Special badges that users can earn';
COMMENT ON COLUMN public.badges.name IS 'Display name of the badge';
COMMENT ON COLUMN public.badges.description IS 'Description of what this badge represents';
COMMENT ON COLUMN public.badges.image_url IS 'URL to the badge image/icon';
COMMENT ON COLUMN public.badges.is_special IS 'Whether this is a special limited badge';
COMMENT ON COLUMN public.badges.is_active IS 'Whether this badge is currently active';
COMMENT ON COLUMN public.badges.criteria IS 'JSON criteria for earning this badge';
