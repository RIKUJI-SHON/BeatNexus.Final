-- 🛎️ Push Notification System - Push Subscriptions テーブル作成
-- 各ユーザーの Web Push 購読情報を保存

-- Push 購読情報テーブル
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription jsonb NOT NULL, -- { endpoint, keys: { p256dh, auth } }
  user_agent text, -- デバッグ用：どのブラウザ/デバイスか
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- 同じユーザー・同じエンドポイントの重複を防ぐ
  UNIQUE(user_id, (subscription->>'endpoint'))
);

-- インデックス：ユーザーIDでの高速検索
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- インデックス：エンドポイントでの重複チェック高速化
CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions USING GIN ((subscription->>'endpoint'));

-- RLS (Row Level Security) 有効化
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ポリシー：ユーザーは自分の購読情報のみアクセス可能
CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 権限付与
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT USAGE ON SEQUENCE push_subscriptions_id_seq TO authenticated;

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_push_subscriptions_updated_at 
  BEFORE UPDATE ON public.push_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE public.push_subscriptions IS 'Web Push 通知の購読情報を保存';
COMMENT ON COLUMN public.push_subscriptions.subscription IS 'ブラウザからの PushSubscription オブジェクト（JSON形式）';
COMMENT ON COLUMN public.push_subscriptions.user_agent IS 'デバッグ・統計用のユーザーエージェント情報'; 