-- Enable Row Level Security on tables that were publicly exposed without RLS
-- 実行日時: 2025-07-05 12:15

-- ⚠️ 既存ポリシーが有効になるだけでデータは変わりません

ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_chat_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_specs      ENABLE ROW LEVEL SECURITY;

-- オプション: profiles と communities は設計上 FORCE を想定しているため明示
ALTER TABLE public.profiles    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.communities FORCE ROW LEVEL SECURITY; 