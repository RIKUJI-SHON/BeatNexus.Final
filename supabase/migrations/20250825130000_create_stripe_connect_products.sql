-- Stripe Connect商品管理テーブル作成
-- 2025-08-25: Stripe Connect統合のための商品・決済データ構造

-- 商品テーブル
CREATE TABLE IF NOT EXISTS products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- 商品基本情報
    name varchar(255) NOT NULL,
    description text,
    price_cents integer NOT NULL CHECK (price_cents > 0),
    currency varchar(3) DEFAULT 'jpy' NOT NULL,
    
    -- Stripe情報
    stripe_product_id varchar(255) UNIQUE NOT NULL,
    stripe_price_id varchar(255) UNIQUE NOT NULL,
    
    -- 関連アカウント
    connected_account_id varchar(255) NOT NULL, -- Stripe Connect Account ID
    owner_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- 商品状態
    is_active boolean DEFAULT true,
    
    -- メタデータ
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- インデックス
    CONSTRAINT valid_currency CHECK (currency IN ('jpy', 'usd', 'eur'))
);

-- 決済セッションテーブル
CREATE TABLE IF NOT EXISTS payment_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Stripe情報
    stripe_session_id varchar(255) UNIQUE NOT NULL,
    stripe_payment_intent_id varchar(255),
    
    -- 商品・購入情報
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    buyer_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    seller_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- 金額情報（プラットフォーム手数料込み）
    total_amount_cents integer NOT NULL,
    application_fee_cents integer NOT NULL,
    currency varchar(3) DEFAULT 'jpy' NOT NULL,
    
    -- セッション状態
    status varchar(50) DEFAULT 'pending' NOT NULL,
    
    -- メタデータ
    metadata jsonb DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_session_status CHECK (status IN ('pending', 'completed', 'failed', 'canceled'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_owner ON products(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_products_connected_account ON products(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_buyer ON payment_sessions(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_seller ON payment_sessions(seller_user_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_sessions_updated_at 
    BEFORE UPDATE ON payment_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 設定
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

-- 商品テーブルのRLSポリシー
CREATE POLICY "商品は公開読み取り可能" ON products
    FOR SELECT USING (is_active = true);

CREATE POLICY "所有者は自分の商品を全操作可能" ON products
    FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "認証ユーザーは商品作成可能" ON products
    FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- 決済セッションテーブルのRLSポリシー
CREATE POLICY "購入者は自分の決済履歴を閲覧可能" ON payment_sessions
    FOR SELECT USING (auth.uid() = buyer_user_id);

CREATE POLICY "販売者は自分の販売履歴を閲覧可能" ON payment_sessions
    FOR SELECT USING (auth.uid() = seller_user_id);

CREATE POLICY "システムが決済セッション作成・更新" ON payment_sessions
    FOR ALL USING (true); -- Edge Function経由でのみアクセス
